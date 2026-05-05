---
title: AI-CLI-Link Architecture
created: '2026-05-05'
updated: '2026-05-05'
description: Detailed system architecture and package structure
tags:
  - architecture
  - packages
  - monorepo
---

# AI-CLI-Link Architecture

## Monorepo Structure

```
ai-cli-link/
├── packages/
│   ├── core/              # Core types, message bus, consensus engine
│   ├── adapters/          # CLI adapters + instance manager
│   ├── server/            # Hono API + orchestrator + static serving
│   ├── web/               # React chat UI + task monitor
│   └── cli/               # CLI entry point
├── wiki/                  # Documentation wiki
└── docs/                  # Design documents and plans
```

## Package Details

### @ai-cli-link/core

**Purpose**: Core data types and orchestration logic

**Key Components**:
- `types.ts` - Message, Node, TaskStatus, MessageType definitions
- `message-bus.ts` - In-memory pub/sub event system
- `consensus.ts` - Consensus engine with voting logic
- `task-manager.ts` - Task lifecycle management

**Exports**:
- `MessageBus` - Event pub/sub
- `TaskManager` - Task CRUD
- `Orchestrator` - Basic task orchestration
- `reachConsensus()` - Consensus decision function

### @ai-cli-link/adapters

**Purpose**: CLI tool adapters and instance management

**Key Components**:
- `instance-manager.ts` - Manages multiple CLI instances
- `base-adapter.ts` - Base adapter interface
- `claude-adapter.ts` - Claude CLI adapter
- `gemini-adapter.ts` - Gemini CLI adapter

**InstanceManager**:
- Creates isolated CLI instances with unique IDs
- Uses project root as work directory (for auth state sharing)
- Supports mock mode via `MOCK_MODE=1` env variable
- Parallel execution with 120s timeout per round

### @ai-cli-link/server

**Purpose**: HTTP API server and discussion orchestrator

**Key Components**:
- `index.ts` - Hono server setup + static file serving
- `orchestrator.ts` - DiscussionOrchestrator class
- `ws/handler.ts` - WebSocket handler for real-time updates

**API Endpoints**:
- `POST /api/discuss` - Submit task for discussion
- `GET /health` - Health check
- `GET /` - Serve frontend (static files)

**WebSocket**:
- Runs on port 3001
- Broadcasts task updates and messages
- Real-time discussion monitoring

### @ai-cli-link/web

**Purpose**: React frontend with chat interface

**Key Components**:
- `App.tsx` - Main app with mode switching
- `TaskChat.tsx` - Chat-style task submission
- `TaskMonitor.tsx` - Real-time discussion monitoring

**Features**:
- Task input with node configuration
- Real-time WebSocket updates
- Message color coding (proposal, revision, consensus)
- Task history tracking

### @ai-cli-link/cli

**Purpose**: Command-line entry point

**Features**:
- Simple CLI interface for task submission
- Supports `--mock` flag for testing
- JSON output for programmatic use

## Data Flow

```
1. User submits task via Web UI
2. Server receives POST /api/discuss
3. DiscussionOrchestrator spawns CLI instances
4. Round 1: Each instance generates proposal
5. Round 2-3: Instances review others, refine proposals
6. Consensus: Best proposal selected
7. Results sent via WebSocket to Web UI
```

## See Also

- [[project-overview]] - Project overview
- [[message-protocol]] - Message types and flow
- [[claude-auth-fix]] - Authentication setup