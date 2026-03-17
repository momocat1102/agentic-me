import { WebSocketServer, WebSocket } from 'ws';
import type { WSMessage, WSMessageType } from '../types/index.js';

let wss: WebSocketServer;

export function initWebSocket(port: number): WebSocketServer {
  wss = new WebSocketServer({ port });
  console.log(`[WS] WebSocket server listening on port ${port}`);

  wss.on('connection', (ws) => {
    console.log(`[WS] Client connected (total: ${wss.clients.size})`);
    ws.on('close', () => {
      console.log(`[WS] Client disconnected (total: ${wss.clients.size})`);
    });
  });

  return wss;
}

export function broadcast(type: WSMessageType, payload: unknown): void {
  if (!wss) return;

  const message: WSMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  const data = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function getWss(): WebSocketServer | undefined {
  return wss;
}
