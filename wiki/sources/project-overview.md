---
title: AI-CLI-Link Project Overview
created: '2026-05-05'
updated: '2026-05-05'
description: Multi-CLI orchestration system with consensus-driven task execution
tags:
  - project
  - overview
  - orchestration
---

# AI-CLI-Link Project Overview

## What is AI-CLI-Link?

AI-CLI-Link is a **multi-CLI orchestration system** that allows users to submit tasks through a chat-like web interface. Multiple AI CLI instances (Claude, Gemini, Qoder) then discuss the task, propose solutions, review each other's work, and reach consensus before executing.

## Core Features

1. **Chat-Style Task Submission**: Users describe tasks via web UI
2. **Persistent Server**: Runs continuously on port 3000
3. **Multi-Instance Discussion**: Spawns 2+ CLI instances for parallel discussion
4. **Consensus Engine**: Majority voting with configurable rounds (default 3)
5. **Real-Time Monitoring**: WebSocket updates for live discussion tracking
6. **Mock Mode**: Test without CLI authentication using simulated responses
7. **Secure Execution**: Uses `child_process.spawn()` for safety

## Architecture

```
┌─────────────────────┐
│   Web UI (Chat)      │  http://localhost:3000
└──────────┬──────────┘
           │ HTTP + WebSocket
┌──────────▼──────────┐
│   Hono Server        │  Port 3000 (HTTP)
│   + Orchestrator     │  Port 3001 (WS)
└──┬──────┬──────────┘
   │      │      │
┌──▼──┐ ┌▼───┐ ┌▼───┐
│C-1  │ │C-2 │ │G-1 │  CLI Instances
└─────┘ └────┘ └────┘
```

## Quick Start

```bash
# Normal mode (requires CLI authentication)
pnpm start

# Mock mode (for testing without auth)
pnpm start:mock

# Open browser at http://localhost:3000
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Language**: TypeScript (strict mode)
- **Server**: Hono (Node.js) + WebSocket
- **Frontend**: React + Vite + TailwindCSS
- **Testing**: Vitest
- **CLI Execution**: child_process.spawn

## See Also

- [[ai-cli-link-architecture]] - Detailed system architecture
- [[discussion-orchestrator]] - How the orchestrator works
- [[claude-auth-fix]] - Authentication setup guide
- [[message-protocol]] - Discussion message types