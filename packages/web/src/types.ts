export interface Node {
  id: string;
  name: string;
  type: 'qoder' | 'claude' | 'gemini' | 'custom';
  config: Record<string, unknown>;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  assignedNodes: string[];
  finalPlan?: string;
  results: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  taskId: string;
  fromNode: string;
  type: 'proposal' | 'comment' | 'vote' | 'decision' | 'result';
  content: string;
  replyTo?: string;
  timestamp: string;
}
