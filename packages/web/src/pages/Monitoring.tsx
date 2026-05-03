import { useState, useEffect } from 'react';
import axios from 'axios';
import useWebSocket from '../hooks/useWebSocket';
import MessageStream from '../components/MessageStream';
import { Task } from '../types';

export default function Monitoring() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    const res = await axios.get('/api/tasks');
    setTasks(res.data);
  };

  const { connected, messages } = useWebSocket({
    taskId: selectedTaskId ?? undefined,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Monitoring</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => setSelectedTaskId(task.id)}
            className={`p-4 rounded-lg text-left border-2 transition-colors ${
              selectedTaskId === task.id
                ? 'border-blue-500 bg-slate-800'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <h3 className="font-medium mb-1">{task.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${
              task.status === 'completed' ? 'bg-green-900 text-green-300' :
              task.status === 'failed' ? 'bg-red-900 text-red-300' :
              task.status === 'executing' ? 'bg-yellow-900 text-yellow-300' :
              task.status === 'discussing' ? 'bg-blue-900 text-blue-300' :
              'bg-slate-700 text-slate-300'
            }`}>
              {task.status}
            </span>
          </button>
        ))}
      </div>

      {selectedTaskId && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3">
            Discussion Log: {tasks.find((t) => t.id === selectedTaskId)?.title}
          </h3>
          <MessageStream messages={messages} />
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-slate-500 text-center py-12">No tasks to monitor.</p>
      )}
    </div>
  );
}
