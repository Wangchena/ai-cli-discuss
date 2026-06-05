import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  taskId: string;
  fromNode: string;
  type: 'proposal' | 'revision' | 'vote' | 'consensus' | 'result' | 'comment';
  content: string;
  round?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface TaskUpdate {
  status?: string;
  round?: number;
  maxRounds?: number;
  consensus?: string;
  assignedNodes?: string[];
  hasConsensus?: boolean;
}

interface DiscussionMonitorProps {
  taskId: string;
  onBack?: () => void;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500'
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2);
}

// Markdown 渲染组件 - 增强版 HTML 输出
const MarkdownContent = ({ content, className = '' }: { content: string; className?: string }) => {
  const isDark = className.includes('text-white');

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className={`text-xl font-bold mb-3 mt-4 pb-2 border-b ${isDark ? 'border-blue-400' : 'border-gray-200'} ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-lg font-bold mb-2 mt-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
              <span className={`w-1 h-5 ${isDark ? 'bg-blue-300' : 'bg-blue-500'} mr-2 rounded`}></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-base font-semibold mb-2 mt-3 ${isDark ? 'text-blue-100' : 'text-gray-700'}`}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`text-sm font-semibold mb-1 mt-2 ${isDark ? 'text-blue-200' : 'text-gray-600'}`}>
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className={`mb-3 leading-relaxed ${isDark ? 'text-blue-50' : 'text-gray-700'}`}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic ${isDark ? 'text-blue-200' : 'text-gray-600'}`}>
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-none ml-0 mb-3 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal ml-5 mb-3 space-y-1 ${isDark ? 'text-blue-50' : 'text-gray-700'}`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start mb-1">
              <span className={`${isDark ? 'text-blue-300' : 'text-blue-500'} mr-2 mt-1`}>•</span>
              <span className={`flex-1 ${isDark ? 'text-blue-50' : 'text-gray-700'}`}>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 ${isDark ? 'border-blue-300 bg-blue-400/20' : 'border-blue-400 bg-blue-50'} pl-4 py-3 my-3 rounded-r`}>
              <div className={`${isDark ? 'text-blue-100' : 'text-gray-700'} italic`}>
                {children}
              </div>
            </blockquote>
          ),
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            return isInline ? (
              <code className={`${isDark ? 'bg-blue-400/30 text-blue-100' : 'bg-gray-100 text-red-600'} px-1.5 py-0.5 rounded text-sm font-mono`}>
                {children}
              </code>
            ) : match ? (
              <div className="my-3 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-800 text-gray-300 px-4 py-2 text-xs flex items-center justify-between">
                  <span>{match[1]}</span>
                  <span className="text-gray-500">Code</span>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0 }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={`${isDark ? 'bg-blue-400/30 text-blue-100' : 'bg-gray-100 text-red-600'} px-1.5 py-0.5 rounded text-sm font-mono`}>
                {children}
              </code>
            );
          },
          a: ({ children, href }) => (
            <a
              href={href}
              className={`${isDark ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'} underline ${isDark ? 'decoration-blue-300' : 'decoration-blue-300'} hover:decoration-blue-600 transition-colors`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg shadow-sm">
              <table className={`border-collapse w-full text-sm ${isDark ? 'text-blue-50' : ''}`}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={isDark ? 'bg-blue-400/20' : 'bg-gray-50'}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className={`border ${isDark ? 'border-blue-400/30' : 'border-gray-200'} px-3 py-2 text-left font-semibold ${isDark ? 'text-blue-100' : 'text-gray-700'} ${isDark ? 'bg-blue-400/20' : 'bg-gray-50'}`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border ${isDark ? 'border-blue-400/30' : 'border-gray-200'} px-3 py-2 ${isDark ? 'text-blue-50' : 'text-gray-600'}`}>
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className={`${isDark ? 'hover:bg-blue-400/10' : 'hover:bg-gray-50'} transition-colors`}>
              {children}
            </tr>
          ),
          hr: () => (
            <hr className={`my-4 border-t-2 ${isDark ? 'border-blue-400/30' : 'border-gray-200'}`} />
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="my-3 rounded-lg shadow-md max-w-full h-auto"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// 复制按钮组件
const CopyButton = ({ text, label = '复制为 MD' }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center space-x-1"
      title="复制 Markdown 源码"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span>{copied ? '已复制!' : label}</span>
    </button>
  );
};

export default function DiscussionMonitor({ taskId, onBack }: DiscussionMonitorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [taskStatus, setTaskStatus] = useState<string>('discussing');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [maxRounds, setMaxRounds] = useState<number>(3);
  const [connected, setConnected] = useState(false);
  const [assignedNodes, setAssignedNodes] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [submittingInput, setSubmittingInput] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [consensusContent, setConsensusContent] = useState<{ content: string; hasConsensus: boolean; fromNode: string } | null>(null);

  useEffect(() => {
    fetch(`http://localhost:3000/api/discuss/${taskId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.messages && Array.isArray(data.messages)) {
            const normalMsgs: Message[] = [];
            let consensusMsg: Message | null = null;
            for (const msg of data.messages) {
              if (msg.type === 'consensus') {
                consensusMsg = msg;
              } else {
                normalMsgs.push(msg);
              }
            }
            // 按时间排序确保消息顺序正确
            normalMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setMessages(normalMsgs);
            if (consensusMsg) {
              setConsensusContent({
                content: consensusMsg.content,
                hasConsensus: consensusMsg.metadata?.consensus === 'reached',
                fromNode: getNodeLabelFromMsg(consensusMsg, data.config?.roles || []),
              });
            }
          }
          setTaskStatus(data.status);
          setTaskTitle(data.task || '');
          if (data.config?.roles) setAssignedNodes(data.config.roles);
        }
      })
      .catch(err => console.error('Failed to load discussion:', err));
  }, [taskId]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', taskId }));
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.taskId !== taskId) return;

        if (parsed.type === 'message') {
          const msg = parsed.data as Message;
          if (msg.type === 'consensus') {
            const roles = assignedNodes;
            const idx = parseInt(msg.fromNode.split('-')[1]) - 1;
            const label = roles[idx] || msg.fromNode;
            setConsensusContent({
              content: msg.content,
              hasConsensus: msg.metadata?.consensus === 'reached',
              fromNode: label,
            });
          } else {
            setMessages((prev) => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        } else if (parsed.type === 'task-update') {
          const data = parsed.data as TaskUpdate;
          if (data.status) setTaskStatus(data.status);
          if (data.round) setCurrentRound(data.round);
          if (data.maxRounds) setMaxRounds(data.maxRounds);
          if (data.assignedNodes) setAssignedNodes(data.assignedNodes);
          if (data.consensus) {
            setConsensusContent({
              content: data.consensus,
              hasConsensus: data.hasConsensus ?? true,
              fromNode: assignedNodes[0] || '系统',
            });
          }
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [taskId, assignedNodes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getNodeLabelFromMsg = (msg: Message, roles: string[]): string => {
    if (msg.fromNode === 'user') return '我';
    if (msg.fromNode === 'orchestrator') return '系统';
    const idx = parseInt(msg.fromNode.split('-')[1]) - 1;
    return roles[idx] || msg.fromNode;
  };

  const getNodeLabel = (fromNode: string): string => {
    if (fromNode === 'user') return '我';
    if (fromNode === 'orchestrator') return '系统';
    const idx = parseInt(fromNode.split('-')[1]) - 1;
    return assignedNodes[idx] || fromNode;
  };

  const getNodeAvatar = (fromNode: string): string => {
    if (fromNode === 'user') return 'bg-gray-500';
    if (fromNode === 'orchestrator') return 'bg-green-500';
    const idx = parseInt(fromNode.split('-')[1]) - 1;
    return getAvatarColor(idx);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      taskId,
      fromNode: 'user',
      type: 'comment',
      content: userInput,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    const msgContent = userInput;
    setUserInput('');
    setSubmittingInput(true);

    try {
      const response = await fetch(`http://localhost:3000/api/discuss/${taskId}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgContent }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to send message:', data.error);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setSubmittingInput(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] w-full flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-t-lg shadow-sm border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <span className="font-medium text-gray-900 truncate max-w-xs">
            {taskTitle || '讨论中...'}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2">
            {assignedNodes.map((node, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full ${getAvatarColor(i)} text-white text-xs flex items-center justify-center border-2 border-white`}
                title={node}
              >
                {getInitials(node)}
              </div>
            ))}
          </div>
          <span className={`text-xs ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? '在线' : '离线'}
          </span>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white px-4 py-2 border-b flex items-center justify-between text-sm flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${
            taskStatus === 'discussing' ? 'bg-yellow-500 animate-pulse' :
            taskStatus === 'completed' ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <span className="text-gray-600">
            {taskStatus === 'discussing' ? `讨论中 - 第 ${currentRound}/${maxRounds} 轮` :
             taskStatus === 'completed' ? '讨论已完成' : taskStatus}
          </span>
        </div>
      </div>

      {/* Main Content: Left Discussion + Right Consensus */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Discussion Messages - 占据 2/3 宽度 */}
        <div className="flex-[2] bg-gray-50 overflow-y-auto border-r border-gray-200 min-w-0">
          <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm border-b px-4 py-2 z-10">
            <h3 className="text-sm font-semibold text-gray-600">讨论消息 ({messages.length})</h3>
          </div>
          <div className="px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-1">
                  {taskStatus === 'discussing' ? '等待讨论消息...' : '暂无消息'}
                </p>
                <p className="text-gray-400 text-xs">
                  {taskStatus === 'discussing' ? 'AI 实例正在分析任务' : '讨论尚未开始'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.fromNode === 'user';
                const label = getNodeLabel(msg.fromNode);

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[90%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full ${getNodeAvatar(msg.fromNode)} text-white text-sm flex-shrink-0 flex items-center justify-center`}>
                        {getInitials(label)}
                      </div>

                      {/* Message Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center justify-between ${isUser ? 'flex-row-reverse' : ''} mb-1`}>
                          <div className={`flex items-center space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-xs font-medium text-gray-700">{label}</span>
                            {msg.round && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">第 {msg.round} 轮</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                            <CopyButton text={msg.content} />
                          </div>
                        </div>
                        <div className={`rounded-lg overflow-hidden ${
                          isUser
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white shadow-sm border border-gray-200'
                        }`}>
                          <div className={`px-4 py-3 ${isUser ? '' : ''}`}>
                            <MarkdownContent
                              content={msg.content}
                              className={isUser ? 'text-white' : ''}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right: Consensus / Divergence Panel - 占据 1/3 宽度 */}
        <div className="flex-[1] bg-gray-50 overflow-y-auto flex-shrink-0 min-w-[320px] max-w-[480px]">
          <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm border-b px-4 py-3 z-10">
            <h3 className="text-sm font-semibold text-gray-700">
              {consensusContent
                ? (consensusContent.hasConsensus
                    ? '✓ 达成共识'
                    : '⚠ 分歧点')
                : '讨论总结'}
            </h3>
          </div>
          <div className="p-4">
            {!consensusContent ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full bg-white mx-auto mb-4 flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  {taskStatus === 'discussing' ? '讨论进行中...' : '暂无总结'}
                </p>
                <p className="text-xs text-gray-400">
                  {taskStatus === 'discussing' ? '结束后将自动生成总结' : '讨论尚未开始'}
                </p>
              </div>
            ) : (
              <div>
                <div className={`rounded-lg p-3 mb-3 ${
                  consensusContent.hasConsensus
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${consensusContent.hasConsensus ? 'text-green-600' : 'text-amber-600'}`}>
                        {consensusContent.hasConsensus ? '✓' : '⚠'}
                      </span>
                      <span className={`text-sm font-medium ${consensusContent.hasConsensus ? 'text-green-800' : 'text-amber-800'}`}>
                        {consensusContent.hasConsensus ? '共识总结' : '分歧总结'}
                      </span>
                    </div>
                    <CopyButton text={consensusContent.content} label="复制 MD" />
                  </div>
                  <span className="text-xs text-gray-500">
                    由 {consensusContent.fromNode} 总结
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <MarkdownContent content={consensusContent.content} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-4 py-3 flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={taskStatus === 'completed' ? '讨论已完成，发送新问题将触发重新讨论...' : '输入消息发送到讨论群...'}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submittingInput}
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || submittingInput}
            className="px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {submittingInput ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
