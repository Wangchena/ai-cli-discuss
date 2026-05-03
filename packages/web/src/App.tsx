import { useState, useEffect } from 'react';
import DiscussionMonitor from './components/DiscussionMonitor';

export default function App() {
  const [taskId, setTaskId] = useState<string | null>(null);

  // Check URL params for task ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('task');
    if (id) {
      setTaskId(id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">AI-CLI-Link Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            {taskId ? `Task: ${taskId}` : 'Waiting for task...'}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {taskId ? (
          <DiscussionMonitor taskId={taskId} />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              No active task. Start a discussion from the terminal:
            </p>
            <pre className="bg-gray-100 rounded p-4 mt-4 text-left text-sm">
              <code>ai-cli-link "your task description"</code>
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
