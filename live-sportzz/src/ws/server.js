import { WebSocket, WebSocketServer } from 'ws'
import { wsArcJet } from '../arcjet';

/**
 * Send a JSON-serializable payload over an open WebSocket.
 * Does nothing if the socket is not in the OPEN state.
 * @param {WebSocket} socket - The WebSocket to send the payload on.
 * @param {*} payload - The value to JSON.stringify and transmit.
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


/**
 * Attach a WebSocketServer to the given HTTP server at path "/ws" and manage connections.
 *
 * Sets up an endpoint that enforces an optional wsArcJet protection check on new connections
 * (closing denied connections with code 1013 for rate limits or 1008 for access denied, and
 * 1011 on protection errors), marks sockets as alive, responds to pongs, sends a welcome
 * message on connect, logs socket errors, and maintains a heartbeat that pings clients every
 * 30 seconds and terminates unresponsive ones.
 *
 * @param {import('http').Server} server - HTTP server to attach the WebSocketServer to.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object exposing `broadcastMatchCreated`,
 *          a function that broadcasts a `{ type: 'match_created', data: match }` message to all connected clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024,
    })

    wss.on('connection', async (socket) => {
        if(wsArcJet){
            try {
                const decision = await wsArcJet.protect(req);
                if(decision.isDenied()){
                  const code  = decision.reason.isRateLimit() ? 1013 : 1008;
                  const reason = decision.reason.isRateLimit() ? "Rate limit exceeded" : "Access denied";

                  socket.close(code, reason);
                  return;
                }

            } catch (error) {
                console.log("Ws connection error");
                socket.close(1011, "Server security error");
            }
        }
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });
        sendJson(socket, { type: "Welcome" });
        socket.on("error", console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if(ws.isAlive === false) return ws.terminate();
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