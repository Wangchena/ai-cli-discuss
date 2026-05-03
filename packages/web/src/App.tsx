import { Routes, Route, Link, useLocation } from 'react-router-dom';
import NodeManagement from './pages/NodeManagement';
import TaskCanvas from './pages/TaskCanvas';
import Monitoring from './pages/Monitoring';

export default function App() {
  const location = useLocation();

  const navItems = [
    { path: '/nodes', label: 'Nodes' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/monitor', label: 'Monitor' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 border-r border-slate-700 p-4">
        <h1 className="text-xl font-bold text-white mb-6">AI-CLI-Link</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/nodes" element={<NodeManagement />} />
          <Route path="/tasks" element={<TaskCanvas />} />
          <Route path="/monitor" element={<Monitoring />} />
          <Route path="*" element={<NodeManagement />} />
        </Routes>
      </main>
    </div>
  );
}
