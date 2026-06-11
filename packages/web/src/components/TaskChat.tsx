import { useState, useEffect } from 'react';

interface TaskChatProps {
  onTaskStart: (taskId: string) => void;
  onOpenDiscussion?: (taskId: string) => void;
}

interface RoleConfig {
  id: string;
  label: string;
  desc: string;
  defaultPrompt: string;
}

const PRESET_ROLES: RoleConfig[] = [
  {
    id: 'manager',
    label: '管理者',
    desc: '统筹全局，确保方案可落地',
    defaultPrompt: '你是项目管理者，负责统筹全局。请从项目整体可行性、资源分配、风险评估角度分析任务，确保方案可落地执行。',
  },
  {
    id: 'pm',
    label: '资深产品经理',
    desc: '从用户需求和业务价值角度分析',
    defaultPrompt: '你是资深产品经理，拥有 10 年+产品经验。请从用户需求、业务价值、市场竞争角度分析任务，关注用户体验和商业目标。',
  },
  {
    id: 'frontend',
    label: '前端开发专家',
    desc: '关注用户体验和前端实现',
    defaultPrompt: '你是前端开发专家，精通 React/Vue/Angular 等主流框架。请从用户体验、前端架构、性能优化、可访问性角度分析任务。',
  },
  {
    id: 'backend',
    label: '资深后端工程师',
    desc: '关注系统架构和后端实现',
    defaultPrompt: '你是资深后端工程师，精通分布式系统设计。请从系统架构、数据库设计、API 设计、性能、安全性角度分析任务。',
  },
  {
    id: 'architect',
    label: '架构师',
    desc: '关注整体架构和技术选型',
    defaultPrompt: '你是系统架构师，负责整体技术架构设计。请从技术选型、系统分层、扩展性、可维护性、技术债务角度分析任务。',
  },
  {
    id: 'custom',
    label: '自定义',
    desc: '自定义角色描述',
    defaultPrompt: '请描述你的角色定位和专业领域，然后从该角度分析任务。',
  },
];

interface SelectedRole {
  roleId: string;
  count: number;
  prompt: string;
}

interface DiscussionRecord {
  taskId: string;
  task: string;
  status: string;
  createdAt: string;
  messageCount: number;
}

export default function TaskChat({ onTaskStart, onOpenDiscussion }: TaskChatProps) {
  const [input, setInput] = useState('');
  const [nodeType, setNodeType] = useState('qoder');
  const [selectedRoles, setSelectedRoles] = useState<SelectedRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discussionHistory, setDiscussionHistory] = useState<DiscussionRecord[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscussionHistory();
  }, []);

  const fetchDiscussionHistory = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/discuss');
      const data = await res.json();
      if (data.success) {
        setDiscussionHistory(data.discussions.map((d: any) => ({
          taskId: d.taskId,
          task: d.task,
          status: d.status,
          createdAt: d.createdAt,
          messageCount: d.messages?.length || 0,
        })));
      }
    } catch {
      // Ignore errors
    }
  };

  const handleRoleToggle = (roleId: string) => {
    const existing = selectedRoles.find(r => r.roleId === roleId);
    if (existing) {
      // 取消勾选
      setSelectedRoles(prev => prev.filter(r => r.roleId !== roleId));
      if (expandedRole === roleId) setExpandedRole(null);
    } else {
      // 勾选 - 添加新角色
      const preset = PRESET_ROLES.find(r => r.id === roleId);
      setSelectedRoles(prev => [...prev, {
        roleId,
        count: 1,
        prompt: preset?.defaultPrompt || '',
      }]);
      setExpandedRole(roleId);
    }
  };

  const handleCountChange = (roleId: string, count: number) => {
    setSelectedRoles(prev => prev.map(r =>
      r.roleId === roleId ? { ...r, count: Math.max(1, Math.min(5, count)) } : r
    ));
  };

  const handlePromptChange = (roleId: string, prompt: string) => {
    setSelectedRoles(prev => prev.map(r =>
      r.roleId === roleId ? { ...r, prompt } : r
    ));
  };

  const getTotalInstances = () => selectedRoles.reduce((sum, r) => sum + r.count, 0);

  const getRolesAndPrompts = () => {
    const roles: string[] = [];
    const prompts: string[] = [];
    for (const sr of selectedRoles) {
      const preset = PRESET_ROLES.find(r => r.id === sr.roleId);
      const label = sr.roleId === 'custom' ? (sr.prompt.split('\n')[0].slice(0, 20) || '自定义') : (preset?.label || sr.roleId);
      for (let i = 0; i < sr.count; i++) {
        roles.push(label);
        prompts.push(sr.prompt);
      }
    }
    return { roles, prompts };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { roles, prompts } = getRolesAndPrompts();
      const totalInstances = getTotalInstances();

      const response = await fetch('http://localhost:3000/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: input,
          config: {
            nodes: [{ type: nodeType, count: totalInstances }],
            maxRounds: 3,
            roles: roles.length > 0 ? roles : undefined,
            prompts: prompts.length > 0 ? prompts : undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchDiscussionHistory();
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

  const handleOpenDiscussion = (taskId: string) => {
    if (onOpenDiscussion) {
      onOpenDiscussion(taskId);
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

      {/* Role Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Discussion Roles
          {selectedRoles.length > 0 && (
            <span className="ml-2 text-xs font-normal text-blue-600">
              ({selectedRoles.length} roles, {getTotalInstances()} instances)
            </span>
          )}
        </h3>
        <div className="space-y-2">
          {PRESET_ROLES.map(role => {
            const isSelected = selectedRoles.some(r => r.roleId === role.id);
            const isExpanded = expandedRole === role.id;
            const selectedRole = selectedRoles.find(r => r.roleId === role.id);

            return (
              <div key={role.id} className={`border rounded-lg transition-all ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                {/* Role Header */}
                <label className="flex items-center space-x-3 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleRoleToggle(role.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{role.label}</span>
                    <p className="text-xs text-gray-500">{role.desc}</p>
                  </div>
                  {isSelected && selectedRole && (
                    <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-gray-500">数量:</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={selectedRole.count}
                        onChange={e => handleCountChange(role.id, parseInt(e.target.value) || 1)}
                        className="w-14 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {isExpanded ? '收起' : '编辑 Prompt'}
                      </button>
                    </div>
                  )}
                </label>

                {/* Expanded Prompt Editor */}
                {isSelected && isExpanded && (
                  <div className="px-3 pb-3 border-t border-blue-200 pt-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">角色 Prompt（可自定义）</label>
                    <textarea
                      value={selectedRole?.prompt || ''}
                      onChange={e => handlePromptChange(role.id, e.target.value)}
                      className="w-full h-24 border border-gray-300 rounded px-3 py-2 text-sm font-mono resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入角色 Prompt..."
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">此 Prompt 将发送给该角色的每个实例</span>
                      <button
                        type="button"
                        onClick={() => handlePromptChange(role.id, PRESET_ROLES.find(r => r.id === role.id)?.defaultPrompt || '')}
                        className="text-xs text-gray-500 hover:text-blue-600"
                      >
                        恢复默认
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CLI Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-600">CLI:</span>
          <select
            value={nodeType}
            onChange={e => setNodeType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="qoder">Qoder</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="deepseek">DeepSeek</option>
          </select>
          <span className="text-gray-400">×</span>
          <span className="font-medium text-gray-900">{getTotalInstances() || 0}</span>
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
            placeholder="Describe your task... e.g., 'Design a user registration system with email verification'"
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

      {/* Discussion History */}
      {discussionHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Discussion History</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {discussionHistory.map((item) => (
              <div
                key={item.taskId}
                className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer rounded"
                onClick={() => handleOpenDiscussion(item.taskId)}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 truncate block">{item.task}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()} • {item.messageCount} messages
                  </span>
                </div>
                <span className={`text-xs ml-2 px-2 py-1 rounded ${
                  item.status === 'completed' ? 'bg-green-100 text-green-700' :
                  item.status === 'discussing' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
