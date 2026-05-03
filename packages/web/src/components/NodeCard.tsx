import { Node } from '../types';

const statusColors: Record<Node['status'], string> = {
  idle: 'bg-green-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
};

interface NodeCardProps {
  node: Node;
  onDelete: () => void;
}

export default function NodeCard({ node, onDelete }: NodeCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{node.name}</h3>
        <button
          onClick={onDelete}
          aria-label={`Delete node ${node.name}`}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Delete
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[node.status]}`} />
          <span className="text-slate-300 capitalize">{node.status}</span>
        </div>
        <p className="text-slate-400">Type: <span className="text-slate-200 capitalize">{node.type}</span></p>
        <p className="text-slate-400">Capabilities: <span className="text-slate-200">{node.capabilities.join(', ') || 'None'}</span></p>
        <p className="text-slate-400">Timeout: <span className="text-slate-200">{(node.config.timeout as number ?? 30000)}ms</span></p>
      </div>
    </div>
  );
}
