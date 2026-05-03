import { Message } from '../types';

const typeColors: Record<Message['type'], string> = {
  proposal: 'border-blue-500 bg-blue-900/20',
  comment: 'border-slate-500 bg-slate-800',
  vote: 'border-green-500 bg-green-900/20',
  decision: 'border-yellow-500 bg-yellow-900/20',
  result: 'border-purple-500 bg-purple-900/20',
};

interface MessageStreamProps {
  messages: Message[];
}

export default function MessageStream({ messages }: MessageStreamProps) {
  if (messages.length === 0) {
    return <p className="text-slate-500 text-center py-8">No messages yet</p>;
  }

  return (
    <div className="space-y-3 max-h-96 overflow-auto">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-3 rounded border-l-4 ${typeColors[msg.type]}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-sm font-medium">{msg.fromNode}</span>
            <span className="text-xs text-slate-500">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <span className="text-xs uppercase text-slate-400 mr-2">[{msg.type}]</span>
          <p className="text-sm mt-1">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
