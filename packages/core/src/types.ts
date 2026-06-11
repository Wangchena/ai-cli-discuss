export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedNodes: string[];
  finalPlan?: string;
  results: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus =
  | 'pending'
  | 'discussing'
  | 'decided'
  | 'executing'
  | 'completed'
  | 'failed';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  config: Record<string, unknown>;
  status: NodeStatus;
  capabilities: string[];
}

export type NodeType = 'qoder' | 'claude' | 'gemini' | 'deepseek' | 'custom';
export type NodeStatus = 'idle' | 'busy' | 'error';

export interface Message {
  id: string;
  taskId: string;
  fromNode: string;
  type: MessageType;
  content: string;
  round?: number;              // Discussion round (1, 2, 3)
  replyTo?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type MessageType = 'proposal' | 'revision' | 'comment' | 'vote' | 'consensus' | 'decision' | 'result';

export interface Vote {
  nodeId: string;
  taskId: string;
  proposalMessageId: string;
}
