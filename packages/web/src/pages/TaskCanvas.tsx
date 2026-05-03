import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Task } from '../types';

const initialNodes: Node[] = [
  {
    id: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Start' },
    style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px', padding: '10px' },
  },
];

export default function TaskCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await axios.get('/api/tasks');
    setTasks(res.data);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addFlowNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 150 },
      data: { label: `${type} node` },
      style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px', padding: '10px' },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const createTask = async () => {
    if (!newTask.title) return;
    await axios.post('/api/tasks', {
      title: newTask.title,
      description: newTask.description,
      assignedNodes: [],
    });
    setNewTask({ title: '', description: '' });
    fetchTasks();
  };

  const startTask = async (taskId: string) => {
    await axios.post(`/api/tasks/${taskId}/start`);
    fetchTasks();
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Task Canvas</h2>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-80 space-y-4">
          <div className="p-4 bg-slate-800 rounded space-y-2">
            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
            />
            <textarea
              placeholder="Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
              rows={3}
            />
            <button
              onClick={createTask}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Create Task
            </button>
          </div>

          <div className="space-y-2 overflow-auto max-h-96">
            {tasks.map((task) => (
              <div key={task.id} className="p-3 bg-slate-800 rounded border border-slate-700">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    task.status === 'completed' ? 'bg-green-900 text-green-300' :
                    task.status === 'failed' ? 'bg-red-900 text-red-300' :
                    task.status === 'executing' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {task.status}
                  </span>
                </div>
                {task.status === 'pending' && (
                  <button
                    onClick={() => startTask(task.id)}
                    className="mt-2 text-xs px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button onClick={() => addFlowNode('Qoder')} className="w-full px-3 py-2 bg-slate-700 rounded text-sm hover:bg-slate-600">
              + Qoder Node
            </button>
            <button onClick={() => addFlowNode('Claude')} className="w-full px-3 py-2 bg-slate-700 rounded text-sm hover:bg-slate-600">
              + Claude Node
            </button>
            <button onClick={() => addFlowNode('Gemini')} className="w-full px-3 py-2 bg-slate-700 rounded text-sm hover:bg-slate-600">
              + Gemini Node
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-800 rounded border border-slate-700">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
