---
title: AI-CLI-Link Agent Instructions
created: '2026-05-05'
updated: '2026-05-05'
description: Guidelines and conventions for AI agents working on the AI-CLI-Link project
tags:
  - conventions
  - agent-guidelines
  - development
---

# AI-CLI-Link Agent Instructions

## Project Overview

AI-CLI-Link is a multi-CLI orchestration system where you submit tasks through a chat-like web interface, and multiple AI CLI instances (Claude, Gemini, Qoder) discuss and reach consensus before executing.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Language**: TypeScript (strict mode)
- **Server**: Hono (Node.js) + WebSocket
- **Frontend**: React + Vite + TailwindCSS
- **Testing**: Vitest
- **CLI Execution**: child_process.spawn (secure)

## Quick Start

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev servers (hot reload)
pnpm test                 # Run tests
pnpm build                # Build for production
pnpm start                # Start production server
pnpm start:mock           # Start server with mock responses (testing without CLI auth)
```

## Conventions

- Use `spawn()` not `exec()` for CLI execution (security)
- Mock mode available via `MOCK_MODE=1` env variable
- All instances share project root directory for CLI auth state
- WebSocket on port 3001, HTTP API on port 3000

## Architecture

```
packages/
├── core/              # Message bus, consensus engine, types
├── adapters/          # CLI adapters + instance manager
├── server/            # Hono API + discussion orchestrator + static serving
├── web/               # React chat UI (built into server dist)
└── cli/               # Legacy CLI entry point
```

## Testing

```bash
pnpm test               # Run all tests (44 total)
```

## Known Issues

- [Claude CLI Authentication Fix](bugs/claude-auth-fix.md) - Fixed work directory issue and added mock mode

## Wiki

This project uses llmwiki-cli for documentation. Always update wiki when making code changes.

See [wiki usage rules](.qoder/rules/wiki.md) for details.