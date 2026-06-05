import { useState } from 'react';
import TaskChat from './components/TaskChat';
import TaskMonitor from './components/TaskMonitor';

export default function App() {
  const [mode, setMode] = useState<'input' | 'monitor'>('input');
  const [taskId, setTaskId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI-CLI-Link</h1>
            <p className="text-sm text-gray-500 mt-1">
              Multi-CLI Orchestration System
            </p>
          </div>
          {mode === 'monitor' && (
            <button
              onClick={() => { setMode('input'); setTaskId(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              + New Task
            </button>
          )}
        </div>
      </header>

      <main className={mode === 'monitor' ? 'w-full' : 'max-w-4xl mx-auto'}>
        {mode === 'input' ? (
          <TaskChat
            onTaskStart={(id) => { setTaskId(id); setMode('monitor'); }}
            onOpenDiscussion={(id) => { setTaskId(id); setMode('monitor'); }}
          />
        ) : (
          taskId && <TaskMonitor taskId={taskId} onBack={() => { setMode('input'); setTaskId(null); }} />
        )}
      </main>
    </div>
  );
}
