import { useState, useEffect } from 'react';
import axios from 'axios';
import NodeCard from '../components/NodeCard';
import { Node } from '../types';

export default function NodeManagement() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'qoder' as Node['type'],
    capabilities: '',
    timeout: '30000',
  });

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/nodes');
      setNodes(res.data);
    } catch {
      setError('Failed to load nodes. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await axios.post('/api/nodes', {
        name: formData.name,
        type: formData.type,
        config: { timeout: parseInt(formData.timeout) || 30000 },
        capabilities: formData.capabilities.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowForm(false);
      setFormData({ name: '', type: 'qoder', capabilities: '', timeout: '30000' });
      fetchNodes();
    } catch {
      setError('Failed to create node. Please try again.');
    }
  };

  const deleteNode = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this node?')) return;
    try {
      setError(null);
      await axios.delete(`/api/nodes/${id}`);
      fetchNodes();
    } catch {
      setError('Failed to delete node. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">CLI Nodes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          {showForm ? 'Cancel' : '+ Add Node'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-800 rounded space-y-3 max-w-md">
          <div>
            <label htmlFor="node-name" className="block text-sm mb-1">Name</label>
            <input
              id="node-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="node-type" className="block text-sm mb-1">Type</label>
            <select
              id="node-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Node['type'] })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
            >
              <option value="qoder">Qoder</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label htmlFor="node-capabilities" className="block text-sm mb-1">Capabilities (comma-separated)</label>
            <input
              id="node-capabilities"
              type="text"
              value={formData.capabilities}
              onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
              placeholder="coding, planning, review"
            />
          </div>
          <div>
            <label htmlFor="node-timeout" className="block text-sm mb-1">Timeout (ms)</label>
            <input
              id="node-timeout"
              type="number"
              value={formData.timeout}
              onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
              min={1000}
              max={300000}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm">
            Create
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading nodes...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} onDelete={() => deleteNode(node.id)} />
            ))}
          </div>

          {nodes.length === 0 && (
            <p className="text-slate-500 text-center py-12">No CLI nodes registered yet. Click "Add Node" to get started.</p>
          )}
        </>
      )}
    </div>
  );
}
