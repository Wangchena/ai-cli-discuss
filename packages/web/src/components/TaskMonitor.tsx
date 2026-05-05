import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  taskId: string;
  fromNode: string;
  type: 'proposal' | 'revision' | 'vote' | 'consensus' | 'result';
  content: string;
  round?: number;
  timestamp: string;
}

interface TaskUpdate {
  status?: string;
  round?: number;
  maxRounds?: number;
  consensus?: string;
}

export default function DiscussionMonitor({ taskId }: { taskId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [taskStatus, setTaskStatus] = useState<string>('discussing');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [maxRounds, setMaxRounds] = useState<number>(3);
  const [consensus, setConsensus] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', taskId }));
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'message') {
          setMessages((prev) => [...prev, parsed.data]);
        } else if (parsed.type === 'task-update') {
          const data = parsed.data as TaskUpdate;
          if (data.status) setTaskStatus(data.status);
          if (data.round) setCurrentRound(data.round);
          if (data.maxRounds) setMaxRounds(data.maxRounds);
          if (data.consensus) setConsensus(data.consensus);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getStatusColor = () => {
    switch (taskStatus) {
      case 'discussing': return 'bg-yellow-500';
      case 'decided': return 'bg-green-500';
      case 'executing': return 'bg-blue-500';
      case 'completed': return 'bg-green-600';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'proposal': return 'border-l-4 border-blue-500 bg-blue-50';
      case 'revision': return 'border-l-4 border-purple-500 bg-purple-50';
      case 'consensus': return 'border-l-4 border-green-500 bg-green-50';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="font-medium text-gray-900">
              Status: {taskStatus}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Round {currentRound}/{maxRounds}
            </span>
            <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? '● Connected' : '● Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Discussion Stream */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Discussion Stream</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Waiting for messages...</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded ${getMessageTypeColor(msg.type)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{msg.fromNode}</span>
                  <span className="text-xs text-gray-500">
                    {msg.round ? `Round ${msg.round}` : ''} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Consensus Panel */}
      {consensus && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-green-500">
          <h2 className="text-lg font-semibold text-green-900 mb-4">✓ Consensus Reached</h2>
          <div className="bg-green-50 rounded p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{consensus}</p>
          </div>
        </div>
      )}
    </div>
  );
}
