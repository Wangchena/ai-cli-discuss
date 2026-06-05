import { WebSocket, WebSocketServer } from 'ws';
import { Message } from '@ai-cli-link/core';

export class WsHandler {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private taskSubscriptions: Map<string, Set<WebSocket>> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws) => this.handleConnection(ws));
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe') {
          this.subscribe(msg.taskId, ws);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      this.taskSubscriptions.forEach((subs) => subs.delete(ws));
    });
  }

  subscribe(taskId: string, ws: WebSocket): void {
    console.log(`[WS] Client subscribing to task: ${taskId}`);
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set());
    }
    this.taskSubscriptions.get(taskId)!.add(ws);
    console.log(`[WS] Total subscribers for ${taskId}: ${this.taskSubscriptions.get(taskId)!.size}`);
  }

  broadcastToTask(taskId: string, message: Message): void {
    console.log(`[WS] Attempting to broadcast to task: ${taskId}`);
    const subs = this.taskSubscriptions.get(taskId);
    console.log(`[WS] Subscribers found: ${subs ? subs.size : 0}`);
    if (!subs) return;

    const payload = JSON.stringify({
      type: 'message',
      taskId,
      data: message,
    });

    subs.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  broadcastMessage(message: Message): void {
    const payload = JSON.stringify({
      type: 'message',
      taskId: message.taskId,
      data: message,
    });

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  broadcastTaskUpdate(taskId: string, task: unknown): void {
    const payload = JSON.stringify({
      type: 'task-update',
      taskId,
      data: task,
    });

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  close(): void {
    this.wss.close();
  }
}
