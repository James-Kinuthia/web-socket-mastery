import { WebSocket, WebSocketServer } from 'ws'
import { wsArcJet } from '../arcjet.js';

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        try {
            client.send(JSON.stringify(payload));
        } catch (err) {
            console.error("WebSocket broadcast failed", err);
        }
    }
}


export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        noServer: true,
        maxPayload: 1024 * 1024,
    })

    // Handle HTTP upgrade - this is where req is available
    server.on('upgrade', async (req, socket, head) => {
        // Only handle /ws path
        if (req.url !== '/ws') {
            socket.destroy();
            return;
        }

        // Apply ArcJet protection during upgrade
        if (wsArcJet) {
            try {
                const decision = await wsArcJet.protect(req);
                if (decision.isDenied()) {
                    const reason = decision.reason.isRateLimit() ? "Rate limit exceeded" : "Access denied";
                    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    socket.destroy();
                    console.log(`WebSocket connection denied: ${reason}`);
                    return;
                }
            } catch (error) {
                console.error("WebSocket security error:", error);
                socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        // Upgrade the connection
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', (socket, req) => {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });
        sendJson(socket, { type: "Welcome" });
        socket.on("error", console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated }

}