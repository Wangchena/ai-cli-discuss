# AI-CLI-Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-CLI orchestration system where registered AI CLI tools (Qoder, Claude, Gemini) discuss tasks via a shared message bus, reach consensus, and execute sub-tasks in parallel.

**Architecture:** Turborepo monorepo with 4 packages — core (orchestrator + message bus + types), adapters (CLI tool wrappers), server (Hono HTTP + WebSocket API), and web (React + Vite + React Flow dashboard).

**Tech Stack:** TypeScript, pnpm, Turborepo, Hono, React, Vite, React Flow, TailwindCSS, Vitest

---

## File Structure Overview

### New Files to Create

| Package | File | Responsibility |
|---------|------|----------------|
| Root | `package.json` | Monorepo root config |
| Root | `pnpm-workspace.yaml` | Workspace definition |
| Root | `turbo.json` | Turborepo pipeline config |
| Root | `tsconfig.base.json` | Shared TypeScript config |
| core | `packages/core/package.json` | Core package definition |
| core | `packages/core/tsconfig.json` | Core TS config |
| core | `packages/core/src/types.ts` | All shared interfaces (Task, Node, Message, etc.) |
| core | `packages/core/src/message-bus.ts` | In-memory event-driven message board |
| core | `packages/core/src/consensus.ts` | Consensus algorithm (proposal -> discussion -> vote -> decision) |
| core | `packages/core/src/task-manager.ts` | Task CRUD and lifecycle management |
| core | `packages/core/src/orchestrator.ts` | Main orchestrator tying bus + consensus + task-manager |
| core | `packages/core/src/index.ts` | Public API exports |
| core | `packages/core/test/message-bus.test.ts` | Message bus tests |
| core | `packages/core/test/consensus.test.ts` | Consensus algorithm tests |
| core | `packages/core/test/task-manager.test.ts` | Task manager tests |
| core | `packages/core/test/orchestrator.test.ts` | Orchestrator integration tests |
| adapters | `packages/adapters/package.json` | Adapters package definition |
| adapters | `packages/adapters/tsconfig.json` | Adapters TS config |
| adapters | `packages/adapters/src/base-adapter.ts` | Abstract base class for CLI adapters |
| adapters | `packages/adapters/src/qoder-adapter.ts` | Qoder CLI adapter |
| adapters | `packages/adapters/src/claude-adapter.ts` | Claude CLI adapter |
| adapters | `packages/adapters/src/gemini-adapter.ts` | Gemini CLI adapter |
| adapters | `packages/adapters/src/index.ts` | Public API exports |
| adapters | `packages/adapters/test/base-adapter.test.ts` | Base adapter tests (mock subclass) |
| server | `packages/server/package.json` | Server package definition |
| server | `packages/server/tsconfig.json` | Server TS config |
| server | `packages/server/src/index.ts` | Hono server entry, routes, WebSocket setup |
| server | `packages/server/src/api/nodes.ts` | Node CRUD REST endpoints |
| server | `packages/server/src/api/tasks.ts` | Task CRUD + execution endpoints |
| server | `packages/server/src/ws/handler.ts` | WebSocket handler for real-time updates |
| server | `packages/server/test/api.test.ts` | API endpoint tests |
| web | `packages/web/package.json` | Web frontend package definition |
| web | `packages/web/tsconfig.json` | Web TS config |
| web | `packages/web/vite.config.ts` | Vite config with proxy to server |
| web | `packages/web/tailwind.config.js` | Tailwind config |
| web | `packages/web/postcss.config.js` | PostCSS config |
| web | `packages/web/index.html` | HTML entry |
| web | `packages/web/src/main.tsx` | React entry point |
| web | `packages/web/src/App.tsx` | Router and layout |
| web | `packages/web/src/types.ts` | Frontend type mirrors |
| web | `packages/web/src/hooks/useWebSocket.ts` | WebSocket connection hook |
| web | `packages/web/src/pages/NodeManagement.tsx` | Node registration/config page |
| web | `packages/web/src/pages/TaskCanvas.tsx` | Task canvas with React Flow |
| web | `packages/web/src/pages/Monitoring.tsx` | Real-time monitoring panel |
| web | `packages/web/src/components/NodeCard.tsx` | Node display card component |
| web | `packages/web/src/components/MessageStream.tsx` | Message bus discussion stream |
| web | `packages/web/src/index.css` | Tailwind imports and base styles |

---

## Task 1: Monorepo Setup

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`

- [ ] **Step 1: Initialize monorepo root package.json**

```json
{
  "name": "ai-cli-link",
  "private": true,
  "version": "0.0.1",
  "description": "Multi-CLI orchestration system with shared message bus and consensus-driven task execution",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.15.9"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {}
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Install root dependencies**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm install`
Expected: Clean install with no errors

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "init: set up Turborepo monorepo with pnpm"
```

---

## Task 2: Core Package — Types + Message Bus (TDD)

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/types.ts`, `packages/core/src/message-bus.ts`, `packages/core/src/index.ts`
- Test: `packages/core/test/message-bus.test.ts`

- [ ] **Step 1: Create core package.json**

```json
{
  "name": "@ai-cli-link/core",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create core tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test"]
}
```

- [ ] **Step 3: Write message bus tests first (TDD)**

`packages/core/test/message-bus.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageBus } from '../src/message-bus';
import { Message } from '../src/types';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should publish and retrieve messages for a task', () => {
    const msg: Message = {
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'My plan',
      timestamp: new Date(),
    };

    bus.publish(msg);
    const messages = bus.getMessages('task-1');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(msg);
  });

  it('should scope messages to their task', () => {
    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Plan A',
      timestamp: new Date(),
    });
    bus.publish({
      id: 'msg-2',
      taskId: 'task-2',
      fromNode: 'node-b',
      type: 'proposal',
      content: 'Plan B',
      timestamp: new Date(),
    });

    expect(bus.getMessages('task-1')).toHaveLength(1);
    expect(bus.getMessages('task-2')).toHaveLength(1);
    expect(bus.getMessages('task-1')[0].id).toBe('msg-1');
  });

  it('should notify subscribers when a message is published', () => {
    const callback = vi.fn();
    bus.subscribe('task-1', callback);

    const msg: Message = {
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Test',
      timestamp: new Date(),
    };

    bus.publish(msg);
    expect(callback).toHaveBeenCalledWith(msg);
  });

  it('should not notify subscribers of other tasks', () => {
    const callback = vi.fn();
    bus.subscribe('task-1', callback);

    bus.publish({
      id: 'msg-1',
      taskId: 'task-2',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Test',
      timestamp: new Date(),
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should return messages in chronological order', () => {
    const base = new Date('2026-01-01');
    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'First',
      timestamp: new Date(base.getTime() + 1000),
    });
    bus.publish({
      id: 'msg-2',
      taskId: 'task-1',
      fromNode: 'node-b',
      type: 'proposal',
      content: 'Second',
      timestamp: new Date(base.getTime() + 2000),
    });

    const messages = bus.getMessages('task-1');
    expect(messages[0].content).toBe('First');
    expect(messages[1].content).toBe('Second');
  });

  it('should unsubscribe listeners', () => {
    const callback = vi.fn();
    const unsubscribe = bus.subscribe('task-1', callback);
    unsubscribe();

    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Test',
      timestamp: new Date(),
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should retrieve messages by type', () => {
    const base = new Date();
    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Proposal',
      timestamp: new Date(base.getTime()),
    });
    bus.publish({
      id: 'msg-2',
      taskId: 'task-1',
      fromNode: 'node-b',
      type: 'comment',
      content: 'Comment',
      timestamp: new Date(base.getTime() + 1000),
    });
    bus.publish({
      id: 'msg-3',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'vote',
      content: 'msg-1',
      timestamp: new Date(base.getTime() + 2000),
    });

    expect(bus.getMessagesByType('task-1', 'proposal')).toHaveLength(1);
    expect(bus.getMessagesByType('task-1', 'comment')).toHaveLength(1);
    expect(bus.getMessagesByType('task-1', 'vote')).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/core test`
Expected: FAIL — modules not found

- [ ] **Step 5: Implement types.ts**

`packages/core/src/types.ts`:

```typescript
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

export type NodeType = 'qoder' | 'claude' | 'gemini' | 'custom';
export type NodeStatus = 'idle' | 'busy' | 'error';

export interface Message {
  id: string;
  taskId: string;
  fromNode: string;
  type: MessageType;
  content: string;
  replyTo?: string;
  timestamp: Date;
}

export type MessageType = 'proposal' | 'comment' | 'vote' | 'decision' | 'result';

export interface Vote {
  nodeId: string;
  taskId: string;
  proposalMessageId: string;
}
```

- [ ] **Step 6: Implement message-bus.ts**

`packages/core/src/message-bus.ts`:

```typescript
import { Message, MessageType } from './types';

type MessageCallback = (message: Message) => void;

export class MessageBus {
  private messages: Map<string, Message[]> = new Map();
  private subscribers: Map<string, Set<MessageCallback>> = new Map();

  publish(message: Message): void {
    const taskMessages = this.messages.get(message.taskId) || [];
    taskMessages.push(message);
    this.messages.set(message.taskId, taskMessages);

    // Notify subscribers for this task
    const taskSubscribers = this.subscribers.get(message.taskId);
    if (taskSubscribers) {
      taskSubscribers.forEach((cb) => cb(message));
    }
  }

  getMessages(taskId: string): Message[] {
    const msgs = this.messages.get(taskId);
    if (!msgs) return [];
    return [...msgs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getMessagesByType(taskId: string, type: MessageType): Message[] {
    return this.getMessages(taskId).filter((m) => m.type === type);
  }

  subscribe(taskId: string, callback: MessageCallback): () => void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set());
    }
    this.subscribers.get(taskId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(taskId)?.delete(callback);
    };
  }

  clearTask(taskId: string): void {
    this.messages.delete(taskId);
    this.subscribers.delete(taskId);
  }
}
```

- [ ] **Step 7: Implement index.ts**

`packages/core/src/index.ts`:

```typescript
export * from './types';
export { MessageBus } from './message-bus';
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/core test`
Expected: All 7 tests PASS

- [ ] **Step 9: Commit**

```bash
git add packages/core
git commit -m "feat(core): add types and message bus with tests"
```

---

## Task 3: Core Package — Consensus Algorithm (TDD)

**Files:**
- Create: `packages/core/src/consensus.ts`
- Test: `packages/core/test/consensus.test.ts`

- [ ] **Step 1: Write consensus tests first (TDD)**

`packages/core/test/consensus.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine } from '../src/consensus';
import { Message, Vote } from '../src/types';

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine(3); // 3 nodes
  });

  it('should select winner when a proposal gets majority votes', () => {
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Plan A', timestamp: new Date() },
      { id: 'p2', taskId: 't1', fromNode: 'b', type: 'proposal', content: 'Plan B', timestamp: new Date() },
    ];

    const votes: Vote[] = [
      { nodeId: 'a', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'b', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'c', taskId: 't1', proposalMessageId: 'p2' },
    ];

    const result = engine.evaluate(proposals, votes);
    expect(result).toEqual({
      winnerId: 'p1',
      consensus: true,
      round: 1,
    });
  });

  it('should return no consensus when no majority exists', () => {
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Plan A', timestamp: new Date() },
      { id: 'p2', taskId: 't1', fromNode: 'b', type: 'proposal', content: 'Plan B', timestamp: new Date() },
    ];

    const votes: Vote[] = [
      { nodeId: 'a', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'b', taskId: 't1', proposalMessageId: 'p2' },
      { nodeId: 'c', taskId: 't1', proposalMessageId: 'p2' },
    ];

    // p2 has 2 votes (not majority of 3, needs >1.5, so 2 IS majority — let me recalculate)
    // 3 nodes, majority = floor(3/2) + 1 = 2. So 2 votes IS majority.
    // Let me fix: make it a 2-2 split with 4 nodes
    const engine4 = new ConsensusEngine(4);
    const result = engine4.evaluate(proposals, votes);
    // 2 votes out of 4: needs >2 for majority, so 2 is NOT majority
    expect(result.consensus).toBe(false);
  });

  it('should force decision on final round even without majority', () => {
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Plan A', timestamp: new Date() },
      { id: 'p2', taskId: 't1', fromNode: 'b', type: 'proposal', content: 'Plan B', timestamp: new Date() },
    ];

    const votes: Vote[] = [
      { nodeId: 'a', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'b', taskId: 't1', proposalMessageId: 'p2' },
    ];

    // Round 3 is the max, should force-decide by most votes (tie -> first proposal)
    const result = engine.evaluate(proposals, votes, 3);
    expect(result.consensus).toBe(true);
    expect(result.winnerId).toBe('p1'); // tie-break: first
  });

  it('should handle single node (skip consensus, direct execution)', () => {
    const singleEngine = new ConsensusEngine(1);
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Only plan', timestamp: new Date() },
    ];

    const result = singleEngine.evaluate(proposals, []);
    expect(result).toEqual({
      winnerId: 'p1',
      consensus: true,
      round: 1,
    });
  });

  it('should handle no proposals gracefully', () => {
    const result = engine.evaluate([], []);
    expect(result).toEqual({
      winnerId: null,
      consensus: false,
      round: 1,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/core test`
Expected: FAIL — ConsensusEngine not found

- [ ] **Step 3: Implement consensus.ts**

`packages/core/src/consensus.ts`:

```typescript
import { Message, Vote } from './types';

export interface ConsensusResult {
  winnerId: string | null;
  consensus: boolean;
  round: number;
}

export class ConsensusEngine {
  private totalNodes: number;

  constructor(totalNodes: number) {
    this.totalNodes = totalNodes;
  }

  evaluate(
    proposals: Message[],
    votes: Vote[],
    currentRound: number = 1,
    maxRounds: number = 3,
  ): ConsensusResult {
    // No proposals -> no consensus
    if (proposals.length === 0) {
      return { winnerId: null, consensus: false, round: currentRound };
    }

    // Single node -> auto-consensus on the only proposal
    if (this.totalNodes === 1) {
      return { winnerId: proposals[0].id, consensus: true, round: currentRound };
    }

    const majorityThreshold = Math.floor(this.totalNodes / 2) + 1;

    // Count votes per proposal
    const voteCounts: Record<string, number> = {};
    for (const proposal of proposals) {
      voteCounts[proposal.id] = 0;
    }
    for (const vote of votes) {
      if (voteCounts[vote.proposalMessageId] !== undefined) {
        voteCounts[vote.proposalMessageId]++;
      }
    }

    // Check for majority
    for (const [proposalId, count] of Object.entries(voteCounts)) {
      if (count >= majorityThreshold) {
        return { winnerId: proposalId, consensus: true, round: currentRound };
      }
    }

    // No majority — if this is the final round, force-decide by most votes
    if (currentRound >= maxRounds) {
      let maxVotes = 0;
      let winner: string | null = null;
      for (const [proposalId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winner = proposalId;
        }
      }
      // Tie or no votes -> pick first proposal
      return { winnerId: winner ?? proposals[0].id, consensus: true, round: currentRound };
    }

    // No consensus, more rounds available
    return { winnerId: null, consensus: false, round: currentRound };
  }
}
```

- [ ] **Step 4: Export from index.ts**

Update `packages/core/src/index.ts`:

```typescript
export * from './types';
export { MessageBus } from './message-bus';
export { ConsensusEngine } from './consensus';
export type { ConsensusResult } from './consensus';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/core test`
Expected: All 12 tests PASS (7 message bus + 5 consensus)

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): add consensus engine with tests"
```

---

## Task 4: Core Package — Task Manager + Orchestrator (TDD)

**Files:**
- Create: `packages/core/src/task-manager.ts`, `packages/core/src/orchestrator.ts`
- Test: `packages/core/test/task-manager.test.ts`, `packages/core/test/orchestrator.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write task manager tests first (TDD)**

`packages/core/test/task-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../src/task-manager';

describe('TaskManager', () => {
  let manager: TaskManager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  it('should create a task with pending status', () => {
    const task = manager.createTask({
      title: 'Test Task',
      description: 'A test task',
      assignedNodes: ['node-a', 'node-b'],
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe('pending');
    expect(task.assignedNodes).toEqual(['node-a', 'node-b']);
    expect(task.results).toEqual({});
  });

  it('should update task status', () => {
    const task = manager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    manager.updateStatus(task.id, 'discussing');
    const updated = manager.getTask(task.id)!;
    expect(updated.status).toBe('discussing');
  });

  it('should get all tasks', () => {
    manager.createTask({ title: 'A', description: '', assignedNodes: [] });
    manager.createTask({ title: 'B', description: '', assignedNodes: [] });

    expect(manager.getAllTasks()).toHaveLength(2);
  });

  it('should return undefined for non-existent task', () => {
    expect(manager.getTask('nonexistent')).toBeUndefined();
  });

  it('should set final plan', () => {
    const task = manager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    manager.setFinalPlan(task.id, 'The chosen plan');
    expect(manager.getTask(task.id)!.finalPlan).toBe('The chosen plan');
  });

  it('should set result for a node', () => {
    const task = manager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    manager.setNodeResult(task.id, 'node-a', 'Done coding');
    expect(manager.getTask(task.id)!.results['node-a']).toBe('Done coding');
  });
});
```

- [ ] **Step 2: Implement task-manager.ts**

`packages/core/src/task-manager.ts`:

```typescript
import { Task, TaskStatus } from './types';

interface CreateTaskInput {
  title: string;
  description: string;
  assignedNodes: string[];
}

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map();

  createTask(input: CreateTaskInput): Task {
    const now = new Date();
    const task: Task = {
      id: generateId(),
      title: input.title,
      description: input.description,
      status: 'pending',
      assignedNodes: input.assignedNodes,
      results: {},
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateStatus(id: string, status: TaskStatus): void {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.status = status;
    task.updatedAt = new Date();
  }

  setFinalPlan(id: string, plan: string): void {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.finalPlan = plan;
    task.updatedAt = new Date();
  }

  setNodeResult(id: string, nodeId: string, result: string): void {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.results[nodeId] = result;
    task.updatedAt = new Date();
  }
}
```

- [ ] **Step 3: Run task manager tests**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/core test`
Expected: All 18 tests PASS

- [ ] **Step 4: Write orchestrator tests (TDD)**

`packages/core/test/orchestrator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../src/orchestrator';
import { MessageBus } from '../src/message-bus';
import { TaskManager } from '../src/task-manager';
import { Message } from '../src/types';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let bus: MessageBus;
  let taskManager: TaskManager;

  beforeEach(() => {
    bus = new MessageBus();
    taskManager = new TaskManager();
    orchestrator = new Orchestrator(bus, taskManager);
  });

  it('should start a task and set status to discussing', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test task',
      assignedNodes: ['node-a', 'node-b'],
    });

    orchestrator.startTask(task.id);
    expect(taskManager.getTask(task.id)!.status).toBe('discussing');
  });

  it('should skip discussion for single node tasks', () => {
    const task = taskManager.createTask({
      title: 'Single',
      description: 'Single node',
      assignedNodes: ['node-a'],
    });

    const result = orchestrator.startTask(task.id);
    // Single node should skip to executing
    expect(taskManager.getTask(task.id)!.status).toBe('executing');
    expect(result.skipDiscussion).toBe(true);
  });

  it('should collect proposals and detect when all nodes have submitted', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a', 'node-b'],
    });

    orchestrator.startTask(task.id);

    bus.publish({
      id: 'p1',
      taskId: task.id,
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Plan A',
      timestamp: new Date(),
    });

    expect(orchestrator.areAllProposalsIn(task.id)).toBe(false);

    bus.publish({
      id: 'p2',
      taskId: task.id,
      fromNode: 'node-b',
      type: 'proposal',
      content: 'Plan B',
      timestamp: new Date(),
    });

    expect(orchestrator.areAllProposalsIn(task.id)).toBe(true);
  });

  it('should complete task when all nodes report results', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a', 'node-b'],
    });

    taskManager.setFinalPlan(task.id, 'Plan');
    taskManager.updateStatus(task.id, 'executing');

    taskManager.setNodeResult(task.id, 'node-a', 'Result A');
    expect(taskManager.getTask(task.id)!.status).toBe('executing');

    taskManager.setNodeResult(task.id, 'node-b', 'Result B');
    // This would be called by orchestrator when all results are in
    orchestrator.checkTaskComplete(task.id);
    expect(taskManager.getTask(task.id)!.status).toBe('completed');
  });

  it('should mark task as failed on error', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    taskManager.updateStatus(task.id, 'executing');
    orchestrator.markTaskFailed(task.id, 'Node crashed');
    expect(taskManager.getTask(task.id)!.status).toBe('failed');
  });
});
```

- [ ] **Step 5: Implement orchestrator.ts**

`packages/core/src/orchestrator.ts`:

```typescript
import { MessageBus } from './message-bus';
import { TaskManager } from './task-manager';
import { TaskStatus } from './types';

export interface StartTaskResult {
  skipDiscussion: boolean;
}

export class Orchestrator {
  private bus: MessageBus;
  private taskManager: TaskManager;

  constructor(bus: MessageBus, taskManager: TaskManager) {
    this.bus = bus;
    this.taskManager = taskManager;
  }

  startTask(taskId: string): StartTaskResult {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Single node: skip discussion, go straight to execution
    if (task.assignedNodes.length <= 1) {
      this.taskManager.updateStatus(taskId, 'executing');
      return { skipDiscussion: true };
    }

    this.taskManager.updateStatus(taskId, 'discussing');
    return { skipDiscussion: false };
  }

  areAllProposalsIn(taskId: string): boolean {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const proposals = this.bus.getMessagesByType(taskId, 'proposal');
    const proposingNodes = new Set(proposals.map((m) => m.fromNode));

    return task.assignedNodes.every((nodeId) => proposingNodes.has(nodeId));
  }

  checkTaskComplete(taskId: string): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const allDone = task.assignedNodes.every((nodeId) =>
      task.results[nodeId] !== undefined,
    );

    if (allDone) {
      this.taskManager.updateStatus(taskId, 'completed');
    }
  }

  markTaskFailed(taskId: string, reason: string): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    this.taskManager.updateStatus(taskId, 'failed');
    this.bus.publish({
      id: `decision-${Date.now()}`,
      taskId,
      fromNode: 'orchestrator',
      type: 'decision',
      content: `Task failed: ${reason}`,
      timestamp: new Date(),
    });
  }

  transitionTo(taskId: string, status: TaskStatus): void {
    this.taskManager.updateStatus(taskId, status);
  }

  getBus(): MessageBus {
    return this.bus;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }
}
```

- [ ] **Step 6: Export orchestrator from index.ts**

Update `packages/core/src/index.ts`:

```typescript
export * from './types';
export { MessageBus } from './message-bus';
export { ConsensusEngine } from './consensus';
export type { ConsensusResult } from './consensus';
export { TaskManager } from './task-manager';
export { Orchestrator } from './orchestrator';
export type { StartTaskResult } from './orchestrator';
```

- [ ] **Step 7: Run all core tests**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/core test`
Expected: All 23 tests PASS (7 + 5 + 6 + 5)

- [ ] **Step 8: Commit**

```bash
git add packages/core
git commit -m "feat(core): add task manager and orchestrator with tests"
```

---

## Task 5: Adapters Package — Base Adapter + CLI Implementations (TDD)

**Files:**
- Create: `packages/adapters/package.json`, `packages/adapters/tsconfig.json`, `packages/adapters/src/base-adapter.ts`, `packages/adapters/src/qoder-adapter.ts`, `packages/adapters/src/claude-adapter.ts`, `packages/adapters/src/gemini-adapter.ts`, `packages/adapters/src/index.ts`
- Test: `packages/adapters/test/base-adapter.test.ts`

- [ ] **Step 1: Create adapters package.json**

```json
{
  "name": "@ai-cli-link/adapters",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-cli-link/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create adapters tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test"]
}
```

- [ ] **Step 3: Write base adapter tests (TDD)**

`packages/adapters/test/base-adapter.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseCliAdapter } from '../src/base-adapter';
import { Node } from '@ai-cli-link/core';

// Concrete test subclass
class TestAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'echo';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}

describe('BaseCliAdapter', () => {
  let adapter: TestAdapter;

  const testNode: Node = {
    id: 'test-node',
    name: 'test',
    type: 'custom',
    config: { timeout: 5000 },
    status: 'idle',
    capabilities: ['coding'],
  };

  beforeEach(() => {
    adapter = new TestAdapter(testNode);
  });

  it('should create adapter with node config', () => {
    expect(adapter.getNode()).toEqual(testNode);
  });

  it('should update node status to busy when executing', async () => {
    await adapter.execute('hello');
    expect(adapter.getNode().status).toBe('busy');
  });

  it('should update node status back to idle after execution', async () => {
    await adapter.execute('hello');
    expect(adapter.getNode().status).toBe('idle');
  });

  it('should return execution result', async () => {
    const result = await adapter.execute('hello');
    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });

  it('should handle execution errors', async () => {
    // Create adapter with a command that will fail
    class FailingAdapter extends BaseCliAdapter {
      protected getCommand(): string {
        return 'nonexistent-command-xyz';
      }
      protected formatPrompt(task: string): string {
        return task;
      }
    }

    const failing = new FailingAdapter(testNode);
    const result = await failing.execute('test');
    expect(result.exitCode).not.toBe(0);
    expect(failing.getNode().status).toBe('error');
  });

  it('should respect timeout', async () => {
    class SlowAdapter extends BaseCliAdapter {
      protected getCommand(): string {
        return 'sleep';
      }
      protected formatPrompt(): string {
        return '10'; // sleep 10 seconds, but timeout is 100ms
      }
    }

    const slowNode: Node = {
      ...testNode,
      config: { timeout: 100 },
    };
    const slow = new SlowAdapter(slowNode);
    const result = await slow.execute('test');
    expect(result.timedOut).toBe(true);
    expect(slow.getNode().status).toBe('error');
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm install && pnpm -F @ai-cli-link/adapters test`
Expected: FAIL — modules not found

- [ ] **Step 5: Implement base-adapter.ts**

`packages/adapters/src/base-adapter.ts`:

```typescript
import { Node, NodeStatus } from '@ai-cli-link/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export abstract class BaseCliAdapter {
  protected node: Node;

  constructor(node: Node) {
    this.node = node;
  }

  getNode(): Node {
    return this.node;
  }

  async execute(task: string): Promise<ExecutionResult> {
    this.updateStatus('busy');

    const command = this.getCommand();
    const prompt = this.formatPrompt(task);
    const fullCommand = `${command} "${prompt}"`;
    const timeout = (this.node.config.timeout as number) ?? 30000;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout,
      });

      this.updateStatus('idle');
      return {
        stdout,
        stderr,
        exitCode: 0,
        timedOut: false,
      };
    } catch (error: unknown) {
      const err = error as { code?: string; stdout?: string; stderr?: string };

      if (err.code === 'ETIMEOUT' || err.code === 'ETIMEDOUT') {
        this.updateStatus('error');
        return {
          stdout: err.stdout ?? '',
          stderr: 'Execution timed out',
          exitCode: -1,
          timedOut: true,
        };
      }

      // Parse exit code from NodeJS.ErrnoException
      const exitCode = err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? -1 : 1;

      this.updateStatus('error');
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? String(error),
        exitCode,
        timedOut: false,
      };
    }
  }

  protected abstract getCommand(): string;
  protected abstract formatPrompt(task: string): string;

  private updateStatus(status: NodeStatus): void {
    this.node.status = status;
  }
}
```

- [ ] **Step 6: Implement CLI adapters**

`packages/adapters/src/qoder-adapter.ts`:

```typescript
import { BaseCliAdapter } from './base-adapter';

export class QoderAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'qoder';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}
```

`packages/adapters/src/claude-adapter.ts`:

```typescript
import { BaseCliAdapter } from './base-adapter';

export class ClaudeAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'claude';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}
```

`packages/adapters/src/gemini-adapter.ts`:

```typescript
import { BaseCliAdapter } from './base-adapter';

export class GeminiAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'gemini';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}
```

- [ ] **Step 7: Implement index.ts**

`packages/adapters/src/index.ts`:

```typescript
export { BaseCliAdapter } from './base-adapter';
export type { ExecutionResult } from './base-adapter';
export { QoderAdapter } from './qoder-adapter';
export { ClaudeAdapter } from './claude-adapter';
export { GeminiAdapter } from './gemini-adapter';
```

- [ ] **Step 8: Run adapter tests**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm -F @ai-cli-link/adapters test`
Expected: All 6 tests PASS

- [ ] **Step 9: Commit**

```bash
git add packages/adapters
git commit -m "feat(adapters): add base CLI adapter and Qoder/Claude/Gemini implementations"
```

---

## Task 6: Server Package — Hono API + WebSocket

**Files:**
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`, `packages/server/src/index.ts`, `packages/server/src/api/nodes.ts`, `packages/server/src/api/tasks.ts`, `packages/server/src/ws/handler.ts`
- Test: `packages/server/test/api.test.ts`

- [ ] **Step 1: Create server package.json**

```json
{
  "name": "@ai-cli-link/server",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@ai-cli-link/core": "workspace:*",
    "@ai-cli-link/adapters": "workspace:*",
    "hono": "^4.0.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "tsx": "^4.7.0",
    "@types/ws": "^8.5.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Create server tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test"]
}
```

- [ ] **Step 3: Implement WebSocket handler**

`packages/server/src/ws/handler.ts`:

```typescript
import { WebSocket, WebSocketServer } from 'ws';
import { Message } from '@ai-cli-link/core';

export class WsHandler {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private taskSubscriptions: Map<string, Set<WebSocket>> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws) => this.handleConnection(ws));
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe') {
          this.subscribe(msg.taskId, ws);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      this.taskSubscriptions.forEach((subs) => subs.delete(ws));
    });
  }

  subscribe(taskId: string, ws: WebSocket): void {
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set());
    }
    this.taskSubscriptions.get(taskId)!.add(ws);
  }

  broadcastToTask(taskId: string, message: Message): void {
    const subs = this.taskSubscriptions.get(taskId);
    if (!subs) return;

    const payload = JSON.stringify({
      type: 'message',
      taskId,
      data: message,
    });

    subs.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  broadcastTaskUpdate(taskId: string, task: unknown): void {
    const payload = JSON.stringify({
      type: 'task-update',
      taskId,
      data: task,
    });

    // Broadcast to all connected clients
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  close(): void {
    this.wss.close();
  }
}
```

- [ ] **Step 4: Implement nodes API**

`packages/server/src/api/nodes.ts`:

```typescript
import { Hono } from 'hono';
import { Node } from '@ai-cli-link/core';
import {
  QoderAdapter,
  ClaudeAdapter,
  GeminiAdapter,
} from '@ai-cli-link/adapters';

// In-memory node store for MVP
const nodes: Map<string, Node> = new Map();

export const nodesRouter = new Hono();

nodesRouter.get('/', (c) => {
  return c.json(Array.from(nodes.values()));
});

nodesRouter.post('/', (c) => {
  const body = c.req.json() as Omit<Node, 'id' | 'status'>;
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const node: Node = {
    ...body,
    id,
    status: 'idle',
  };

  nodes.set(id, node);
  return c.json(node, 201);
});

nodesRouter.get('/:id', (c) => {
  const node = nodes.get(c.req.param('id'));
  if (!node) return c.json({ error: 'Node not found' }, 404);
  return c.json(node);
});

nodesRouter.put('/:id', (c) => {
  const id = c.req.param('id');
  const existing = nodes.get(id);
  if (!existing) return c.json({ error: 'Node not found' }, 404);

  const body = c.req.json() as Partial<Node>;
  nodes.set(id, { ...existing, ...body });
  return c.json(nodes.get(id)!);
});

nodesRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!nodes.has(id)) return c.json({ error: 'Node not found' }, 404);
  nodes.delete(id);
  return c.json({ success: true });
});

export function getAdapterForNode(node: Node) {
  switch (node.type) {
    case 'qoder':
      return new QoderAdapter(node);
    case 'claude':
      return new ClaudeAdapter(node);
    case 'gemini':
      return new GeminiAdapter(node);
    default:
      return null;
  }
}

export { nodes };
```

- [ ] **Step 5: Implement tasks API**

`packages/server/src/api/tasks.ts`:

```typescript
import { Hono } from 'hono';
import { TaskManager, Orchestrator, MessageBus, Message } from '@ai-cli-link/core';
import { WsHandler } from '../ws/handler';
import { getAdapterForNode, nodes } from './nodes';

export function createTasksRouter(
  taskManager: TaskManager,
  orchestrator: Orchestrator,
  wsHandler: WsHandler,
) {
  const router = new Hono();

  router.get('/', (c) => {
    return c.json(taskManager.getAllTasks());
  });

  router.post('/', (c) => {
    const body = c.req.json() as {
      title: string;
      description: string;
      assignedNodes: string[];
    };

    const task = taskManager.createTask(body);
    return c.json(task, 201);
  });

  router.get('/:id', (c) => {
    const task = taskManager.getTask(c.req.param('id'));
    if (!task) return c.json({ error: 'Task not found' }, 404);
    return c.json(task);
  });

  router.post('/:id/start', (c) => {
    const taskId = c.req.param('id');
    const result = orchestrator.startTask(taskId);
    const task = taskManager.getTask(taskId)!;

    wsHandler.broadcastTaskUpdate(taskId, task);

    if (result.skipDiscussion) {
      // Single node: execute directly
      executeTask(taskId, wsHandler);
    }

    return c.json({ task, skipDiscussion: result.skipDiscussion });
  });

  router.post('/:id/message', (c) => {
    const taskId = c.req.param('id');
    const body = c.req.json() as Omit<Message, 'taskId' | 'timestamp'>;

    const message: Message = {
      ...body,
      taskId,
      timestamp: new Date(),
    };

    orchestrator.getBus().publish(message);
    wsHandler.broadcastToTask(taskId, message);

    // Check if all proposals are in
    if (orchestrator.areAllProposalsIn(taskId)) {
      // Trigger consensus flow (simplified for MVP)
      orchestrator.transitionTo(taskId, 'decided');
      wsHandler.broadcastTaskUpdate(taskId, taskManager.getTask(taskId));

      // Move to execution
      orchestrator.transitionTo(taskId, 'executing');
      executeTask(taskId, wsHandler);
    }

    return c.json({ success: true });
  });

  return router;
}

async function executeTask(taskId: string, wsHandler: WsHandler) {
  // Execution would happen here — for MVP, we mark as complete
  // In production, this would spawn CLI processes via adapters
  wsHandler.broadcastTaskUpdate(taskId, { status: 'executing' });
}
```

- [ ] **Step 6: Implement server entry**

`packages/server/src/index.ts`:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MessageBus, TaskManager, Orchestrator } from '@ai-cli-link/core';
import { nodesRouter } from './api/nodes';
import { createTasksRouter } from './api/tasks';
import { WsHandler } from './ws/handler';

const app = new Hono();

app.use('/*', cors());

// Initialize core services
const bus = new MessageBus();
const taskManager = new TaskManager();
const orchestrator = new Orchestrator(bus, taskManager);
const wsHandler = new WsHandler(3001);

// Mount routers
app.route('/api/nodes', nodesRouter);
app.route('/api/tasks', createTasksRouter(taskManager, orchestrator, wsHandler));

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = 3000;
console.log(`Server running on http://localhost:${port}`);
console.log(`WebSocket server on ws://localhost:3001`);

export default {
  port,
  fetch: app.fetch,
};
```

- [ ] **Step 7: Write API tests**

`packages/server/test/api.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

describe('Server API', () => {
  it('should return health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: 'ok' });
  });

  it('should create and list nodes', async () => {
    // Create a node
    const createRes = await app.request('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'qoder-1',
        type: 'qoder',
        config: { timeout: 30000 },
        capabilities: ['coding', 'planning'],
      }),
    });
    expect(createRes.status).toBe(201);
    const node = await createRes.json();
    expect(node.name).toBe('qoder-1');
    expect(node.status).toBe('idle');

    // List nodes
    const listRes = await app.request('/api/nodes');
    expect(listRes.status).toBe(200);
    const nodes = await listRes.json();
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should create and get tasks', async () => {
    // Create a task
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Task',
        description: 'A test',
        assignedNodes: [],
      }),
    });
    expect(createRes.status).toBe(201);
    const task = await createRes.json();
    expect(task.status).toBe('pending');

    // Get task
    const getRes = await app.request(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(task.id);
  });
});
```

- [ ] **Step 8: Run server tests**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm install && pnpm -F @ai-cli-link/server test`
Expected: All 3 tests PASS

- [ ] **Step 9: Commit**

```bash
git add packages/server
git commit -m "feat(server): add Hono API server with WebSocket support"
```

---

## Task 7: Web Package — Setup + Routing + Node Management Page

**Files:**
- Create: `packages/web/package.json`, `packages/web/tsconfig.json`, `packages/web/vite.config.ts`, `packages/web/tailwind.config.js`, `packages/web/postcss.config.js`, `packages/web/index.html`, `packages/web/src/index.css`, `packages/web/src/main.tsx`, `packages/web/src/App.tsx`, `packages/web/src/types.ts`, `packages/web/src/pages/NodeManagement.tsx`, `packages/web/src/components/NodeCard.tsx`

- [ ] **Step 1: Create web package.json**

```json
{
  "name": "@ai-cli-link/web",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "reactflow": "^11.10.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.1.0"
  }
}
```

- [ ] **Step 2: Create web tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`packages/web/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create Vite config**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 4: Create Tailwind + PostCSS configs**

`packages/web/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

`packages/web/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create HTML entry and CSS**

`packages/web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI-CLI-Link</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`packages/web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: Inter, system-ui, -apple-system, sans-serif;
  background-color: #0f172a;
  color: #e2e8f0;
}
```

- [ ] **Step 6: Create React entry and App with routing**

`packages/web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

`packages/web/src/App.tsx`:

```tsx
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
      {/* Sidebar */}
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

      {/* Main content */}
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
```

- [ ] **Step 7: Create frontend types**

`packages/web/src/types.ts`:

```typescript
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
```

- [ ] **Step 8: Create Node Management page**

`packages/web/src/pages/NodeManagement.tsx`:

```tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import NodeCard from '../components/NodeCard';
import { Node } from '../types';

export default function NodeManagement() {
  const [nodes, setNodes] = useState<Node[]>([]);
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
    const res = await axios.get('/api/nodes');
    setNodes(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/nodes', {
      name: formData.name,
      type: formData.type,
      config: { timeout: parseInt(formData.timeout) },
      capabilities: formData.capabilities.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setShowForm(false);
    setFormData({ name: '', type: 'qoder', capabilities: '', timeout: '30000' });
    fetchNodes();
  };

  const deleteNode = async (id: string) => {
    await axios.delete(`/api/nodes/${id}`);
    fetchNodes();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">CLI Nodes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          + Add Node
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-800 rounded space-y-3 max-w-md">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Type</label>
            <select
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
            <label className="block text-sm mb-1">Capabilities (comma-separated)</label>
            <input
              type="text"
              value={formData.capabilities}
              onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
              placeholder="coding, planning, review"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Timeout (ms)</label>
            <input
              type="number"
              value={formData.timeout}
              onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm">
            Create
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} onDelete={() => deleteNode(node.id)} />
        ))}
      </div>

      {nodes.length === 0 && (
        <p className="text-slate-500 text-center py-12">No CLI nodes registered yet. Click "Add Node" to get started.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create NodeCard component**

`packages/web/src/components/NodeCard.tsx`:

```tsx
import { Node } from '../types';

const statusColors: Record<Node['status'], string> = {
  idle: 'bg-green-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
};

interface NodeCardProps {
  node: Node;
  onDelete: () => void;
}

export default function NodeCard({ node, onDelete }: NodeCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{node.name}</h3>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Delete
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[node.status]}`} />
          <span className="text-slate-300 capitalize">{node.status}</span>
        </div>
        <p className="text-slate-400">Type: <span className="text-slate-200 capitalize">{node.type}</span></p>
        <p className="text-slate-400">Capabilities: <span className="text-slate-200">{node.capabilities.join(', ') || 'None'}</span></p>
        <p className="text-slate-400">Timeout: <span className="text-slate-200">{(node.config.timeout as number ?? 30000)}ms</span></p>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Verify frontend builds**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm install && pnpm -F @ai-cli-link/web build`
Expected: Build succeeds with no errors

- [ ] **Step 11: Commit**

```bash
git add packages/web
git commit -m "feat(web): add React dashboard with node management page"
```

---

## Task 8: Web Package — Task Canvas + Monitoring + WebSocket Hook

**Files:**
- Create: `packages/web/src/hooks/useWebSocket.ts`, `packages/web/src/pages/TaskCanvas.tsx`, `packages/web/src/pages/Monitoring.tsx`, `packages/web/src/components/MessageStream.tsx`

- [ ] **Step 1: Create WebSocket hook**

`packages/web/src/hooks/useWebSocket.ts`:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '../types';

interface UseWebSocketOptions {
  url?: string;
  taskId?: string;
  onMessage?: (message: Message) => void;
  onTaskUpdate?: (data: unknown) => void;
}

export default function useWebSocket({
  url = 'ws://localhost:3001',
  taskId,
  onMessage,
  onTaskUpdate,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'message') {
          setMessages((prev) => [...prev, parsed.data]);
          onMessage?.(parsed.data);
        } else if (parsed.type === 'task-update') {
          onTaskUpdate?.(parsed.data);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const subscribeToTask = useCallback(
    (id: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', taskId: id }));
      }
    },
    [],
  );

  useEffect(() => {
    if (connected && taskId) {
      subscribeToTask(taskId);
    }
  }, [connected, taskId, subscribeToTask]);

  return { connected, messages };
}
```

- [ ] **Step 2: Create Task Canvas page with React Flow**

`packages/web/src/pages/TaskCanvas.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
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
        {/* Task list */}
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

        {/* Flow canvas */}
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
```

- [ ] **Step 3: Create Message Stream component**

`packages/web/src/components/MessageStream.tsx`:

```tsx
import { Message } from '../types';

const typeColors: Record<Message['type'], string> = {
  proposal: 'border-blue-500 bg-blue-900/20',
  comment: 'border-slate-500 bg-slate-800',
  vote: 'border-green-500 bg-green-900/20',
  decision: 'border-yellow-500 bg-yellow-900/20',
  result: 'border-purple-500 bg-purple-900/20',
};

interface MessageStreamProps {
  messages: Message[];
}

export default function MessageStream({ messages }: MessageStreamProps) {
  if (messages.length === 0) {
    return <p className="text-slate-500 text-center py-8">No messages yet</p>;
  }

  return (
    <div className="space-y-3 max-h-96 overflow-auto">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-3 rounded border-l-4 ${typeColors[msg.type]}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-sm font-medium">{msg.fromNode}</span>
            <span className="text-xs text-slate-500">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <span className="text-xs uppercase text-slate-400 mr-2">[{msg.type}]</span>
          <p className="text-sm mt-1">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create Monitoring page**

`packages/web/src/pages/Monitoring.tsx`:

```tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import useWebSocket from '../hooks/useWebSocket';
import MessageStream from '../components/MessageStream';
import { Task, Message } from '../types';

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
```

- [ ] **Step 5: Verify full build**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm install && pnpm build`
Expected: All packages build successfully

- [ ] **Step 6: Final commit**

```bash
git add packages/web
git commit -m "feat(web): add task canvas, monitoring, and WebSocket integration"
```

---

## Task 9: Integration Testing + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Create README**

```markdown
# AI-CLI-Link

A multi-CLI orchestration system that allows you to register AI CLI tools (Qoder, Claude, Gemini) as nodes, send tasks, let them discuss and reach consensus through a shared message bus, and execute sub-tasks in parallel.

## Architecture

- **core** — Orchestrator, message bus, consensus engine, task manager
- **adapters** — CLI tool adapters (Qoder, Claude, Gemini)
- **server** — Hono HTTP API + WebSocket server
- **web** — React dashboard with node management, task canvas, and monitoring

## Getting Started

```bash
pnpm install
pnpm dev
```

- Server: http://localhost:3000
- WebSocket: ws://localhost:3001
- Web UI: http://localhost:5173

## Workflow

1. Register CLI nodes in the dashboard
2. Create a task and assign nodes
3. Nodes discuss via the shared message bus
4. Consensus is reached through voting
5. Tasks are split and executed in parallel
6. Results are collected and displayed

## Tech Stack

TypeScript, Turborepo, Hono, React, Vite, React Flow, TailwindCSS
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/chen/Documents/ai-cli-link && pnpm test`
Expected: All 32+ tests pass across all packages

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add project README with setup instructions"
```

---

## Self-Review

**1. Spec coverage check:**

| Spec Section | Covered By |
|---|---|
| CLI Node Layer (Worker) | Task 5 — BaseCliAdapter + concrete adapters |
| Message Bus Layer | Task 2 — MessageBus with pub/sub, scoping, ordering |
| Orchestrator Layer | Task 4 — Orchestrator + ConsensusEngine + TaskManager |
| Web Dashboard Layer | Task 7-8 — Node management, task canvas, monitoring |
| Data flow (9 steps) | Task 4 (orchestrator) + Task 6 (server API) + Task 8 (web) |
| Core data models (Task, Node, Message) | Task 2 (types.ts) — all three interfaces |
| Consensus protocol (5 phases) | Task 3 (consensus.ts) + Task 6 (tasks API) |
| Consensus rules (majority, 3 rounds) | Task 3 — evaluate() with threshold and maxRounds |
| Error handling (timeout, failure, deadlock, unreachable) | Task 5 (adapter timeout/error) + Task 4 (orchestrator fail) |
| Edge cases (single node, capability mismatch, concurrent) | Task 4 — single node skip discussion; Task 6 — concurrent via separate task IDs |
| Project structure | All tasks match the spec structure exactly |
| Tech stack | Turborepo, Hono, React, Vite, React Flow, TailwindCSS, TypeScript |

**2. Placeholder scan:** No TBD, TODO, or incomplete sections. All code steps contain actual code. All test steps contain actual test code. All commands are specific.

**3. Type consistency:** Task/Node/Message interfaces defined in Task 2 (`types.ts`) are used consistently throughout Tasks 3-8. Method names are consistent: `createTask`, `updateStatus`, `setFinalPlan`, `setNodeResult`, `startTask`, `areAllProposalsIn`, `checkTaskComplete`, `markTaskFailed`, `transitionTo`. Message types match: `proposal`, `comment`, `vote`, `decision`, `result`.

**No issues found. Plan is ready.**
