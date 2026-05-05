import { useState } from 'react';

interface TaskChatProps {
  onTaskStart: (taskId: string) => void;
}

export default function TaskChat({ onTaskStart }: TaskChatProps) {
  const [input, setInput] = useState('');
  const [nodeCount, setNodeCount] = useState(2);
  const [nodeType, setNodeType] = useState('claude');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ task: string; taskId: string; status: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: input,
          config: {
            nodes: [{ type: nodeType, count: nodeCount }],
            maxRounds: 3,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHistory(prev => [...prev, { task: input, taskId: data.taskId, status: 'completed' }]);
        onTaskStart(data.taskId);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(`Connection failed: ${err.message}. Is the server running?`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          What would you like to accomplish?
        </h2>
        <p className="text-gray-600">
          Describe your task. Multiple AI instances will discuss and reach consensus.
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-600">Nodes:</span>
          <select
            value={nodeType}
            onChange={e => setNodeType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="qoder">Qoder</option>
          </select>
          <span className="text-gray-400">×</span>
          <input
            type="number"
            min="1"
            max="5"
            value={nodeCount}
            onChange={e => setNodeCount(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 w-16"
          />
          <span className="text-gray-500">instances</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Task Input */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow p-4">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe your task... e.g., 'Refactor packages/core to improve code quality'"
            className="w-full h-32 resize-none border-0 focus:ring-0 text-gray-900 placeholder-gray-400"
            disabled={loading}
          />
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting discussion...' : 'Start Discussion'}
            </button>
          </div>
        </div>
      </form>

      {/* Task History */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Recent Tasks</h3>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-700 truncate flex-1">{item.task}</span>
                <span className="text-xs text-green-600 ml-2">✓ {item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
