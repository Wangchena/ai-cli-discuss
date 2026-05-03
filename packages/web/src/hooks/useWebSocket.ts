import { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '../types';

interface UseWebSocketOptions {
  url?: string;
  taskId?: string;
  onMessage?: (message: Message) => void;
  onTaskUpdate?: (data: unknown) => void;
}

export default function useWebSocket({
  url = 'ws://localhost:3001',
  taskId,
  onMessage,
  onTaskUpdate,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'message') {
          setMessages((prev) => [...prev, parsed.data]);
          onMessage?.(parsed.data);
        } else if (parsed.type === 'task-update') {
          onTaskUpdate?.(parsed.data);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const subscribeToTask = useCallback(
    (id: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', taskId: id }));
      }
    },
    [],
  );

  useEffect(() => {
    if (connected && taskId) {
      subscribeToTask(taskId);
    }
  }, [connected, taskId, subscribeToTask]);

  return { connected, messages };
}
