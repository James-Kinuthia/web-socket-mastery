import { WebSocket, WebSocketServer } from 'ws'

/**
 * Send a JSON-serialized payload to a WebSocket if the socket is open.
 * 
 * @param {WebSocket} socket - The target WebSocket connection.
 * @param {*} payload - The value to serialize and send; must be JSON-serializable.
 */
function sendJsom(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts a payload as JSON to every connected WebSocket client.
 *
 * If any client is not in the OPEN state, broadcasting stops immediately and remaining clients are not sent the payload.
 *
 * @param {import('ws').WebSocketServer} wss - The WebSocket server whose clients will receive the message.
 * @param {*} payload - The value to serialize with `JSON.stringify` and send to clients.
 */
function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) return;
        client.send(JSON.stringify(payload));
    }
}


/**
 * Attach a WebSocket server to an existing HTTP server and expose helpers for broadcasting events.
 *
 * The WebSocket server listens on path `/ws` with a 1 MB max payload, sends a `Welcome` message to each
 * newly connected client, and logs socket errors to the console.
 *
 * @param {import('http').Server} server - An existing HTTP server to attach the WebSocket server to.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object exposing `broadcastMatchCreated`, which broadcasts a `match_created` event with the given match data to all connected clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024,
    })

    wss.on('connection', (socket) => {
        sendJsom(socket, { type: "Welcome" });
        socket.on("error", console.error);
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated }

}