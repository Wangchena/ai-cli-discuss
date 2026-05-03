# AI-CLI-Link Design Document

## Overview

AI-CLI-Link is an open-source multi-CLI orchestration system that allows users to register AI CLI tools (Qoder, Claude, Gemini, etc.) as nodes, assign tasks, let the nodes discuss and reach consensus through a shared message bus, and then execute sub-tasks in parallel.

## Architecture

The system is structured in four layers:

### 1. CLI Node Layer (Worker)

Each CLI tool is wrapped in a Node.js adapter module that handles:
- Receiving task instructions from the orchestrator
- Spawning the CLI as a child process
- Parsing and returning output
- Reporting status and errors

CLI processes support configurable timeouts and can be interrupted.

### 2. Message Bus Layer

An in-memory event-driven message board where all nodes communicate:
- Message types: `proposal`, `comment`, `vote`, `decision`, `result`
- Messages carry timestamps, source node IDs, and optional reply-to references
- Messages are scoped to a specific task
- All messages are persisted to enable replay and audit

### 3. Orchestrator Layer

Manages the full task lifecycle:
- Create task -> Assign nodes -> Start discussion -> Reach consensus -> Distribute sub-tasks -> Collect results
- Implements a lightweight consensus algorithm: proposals -> discussion rounds -> voting -> winner selection
- Splits the agreed plan into sub-tasks and assigns them to nodes for parallel execution

### 4. Web Dashboard Layer

React + Vite frontend with:
- **Node Management**: Register CLI tools, configure parameters, set node types and capabilities
- **Task Canvas**: Drag-and-drop node connections, visually define task flows (React Flow)
- **Monitoring Panel**: Real-time task progress, node output, discussion logs, execution status
- WebSocket connection for real-time updates

## Data Flow

1. User creates a task in the frontend dashboard
2. Backend orchestrator starts the task and notifies assigned CLI nodes
3. Each CLI node reads the task and publishes a proposal to the message bus
4. Nodes read each other's proposals and publish comments (multiple rounds)
5. Nodes vote for the best proposal
6. Orchestrator declares consensus based on voting results
7. Orchestrator splits the agreed plan into sub-tasks
8. CLI nodes execute their assigned sub-tasks in parallel
9. Results are collected and displayed in the dashboard

## Core Data Models

### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'discussing' | 'decided' | 'executing' | 'completed' | 'failed';
  assignedNodes: string[];
  finalPlan?: string;
  results: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Node

```typescript
interface Node {
  id: string;
  name: string;
  type: 'qoder' | 'claude' | 'gemini' | 'custom';
  config: Record<string, any>;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
}
```

### Message

```typescript
interface Message {
  id: string;
  taskId: string;
  fromNode: string;
  type: 'proposal' | 'comment' | 'vote' | 'decision' | 'result';
  content: string;
  replyTo?: string;
  timestamp: Date;
}
```

## Message Protocol — Consensus Flow

```
Phase 1 - Proposal:  Each node submits an initial plan (proposal messages)
Phase 2 - Discussion: Nodes comment on each other's proposals (comment messages, multiple rounds)
Phase 3 - Vote:       Nodes vote for the best proposal (vote messages)
Phase 4 - Decision:    Orchestrator declares consensus (decision message)
Phase 5 - Execution:   Tasks are split and nodes execute in parallel
```

**Consensus Rules:**
- A proposal passes if it receives votes from more than half of the participating nodes
- If no proposal reaches majority, a second discussion round begins
- After a maximum of 3 rounds, the orchestrator makes a final decision based on vote counts

## Error Handling

- **CLI Timeout**: Each node has a configurable execution timeout. On timeout, the node is marked as `error`. The orchestrator decides whether to retry or skip.
- **CLI Failure**: Non-zero exit code -> error output is logged -> other nodes are notified -> other nodes may pick up the failed sub-task.
- **Discussion Deadlock**: After 3 discussion rounds with no consensus, the orchestrator makes a forced decision based on vote counts.
- **Node Unreachable**: Heartbeat detection. Consecutive timeouts mark the node as offline and remove it from the task.

## Edge Cases

- **Single Node**: If only one CLI node is registered, skip discussion and voting, execute directly.
- **Capability Mismatch**: If a task requires capabilities that no registered node provides, return an error to the user.
- **Concurrent Tasks**: Multiple tasks can run simultaneously. CLI nodes manage concurrent sub-tasks through a queue to avoid conflicts.

## Project Structure

```
ai-cli-link/
├── packages/
│   ├── core/                 # Orchestrator + Message Bus + Data Models
│   │   ├── src/
│   │   │   ├── orchestrator.ts
│   │   │   ├── message-bus.ts
│   │   │   ├── task-manager.ts
│   │   │   ├── consensus.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── adapters/             # CLI Node Adapters
│   │   ├── src/
│   │   │   ├── base-adapter.ts
│   │   │   ├── qoder-adapter.ts
│   │   │   ├── claude-adapter.ts
│   │   │   ├── gemini-adapter.ts
│   │   │   └── custom-adapter.ts
│   │   └── package.json
│   │
│   ├── server/               # API Server + WebSocket
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── ws/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── web/                  # React Frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── ...
│       └── package.json
│
├── package.json              # Monorepo root
├── turbo.json                # Turborepo config
└── README.md
```

## Technology Stack

| Category       | Choice                          |
| -------------- | ------------------------------- |
| Monorepo       | Turborepo                       |
| Package Manager| pnpm                            |
| Backend        | Hono (lightweight HTTP + WS)    |
| Frontend       | React + Vite + React Flow       |
| Styling        | TailwindCSS                     |
| Data Storage   | SQLite (optional, memory for MVP) |
| Type Checking  | TypeScript                      |

## Execution Strategy

All CLI nodes execute their assigned sub-tasks in parallel. The orchestrator waits for all results (or errors/timeouts) before marking the task as completed or failed.
