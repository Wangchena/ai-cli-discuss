# AI-CLI-Link

A multi-CLI orchestration system where you submit tasks through a chat-like web interface, and multiple AI CLI instances (Claude, Gemini, Qoder) discuss and reach consensus before executing.

## Features

- **Chat-Style Task Submission**: Describe your task in the web UI, no terminal needed
- **Persistent Server**: Server runs continuously, serving both API and frontend
- **Multi-Instance Discussion**: Automatically spawns 2+ CLI instances that generate proposals, review each other's work, and refine approaches through 2-3 rounds
- **Consensus Engine**: Majority voting with configurable rounds, automatic merge of best ideas
- **Real-Time Monitoring**: Watch the discussion unfold via WebSocket
- **Secure Execution**: Uses `child_process.spawn()` instead of `exec()` to prevent shell injection

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the server (runs continuously on port 3000)
pnpm start

# Open browser at http://localhost:3000
# Submit your task through the chat interface
```

### Mock Mode (Testing Without CLI Authentication)

If your CLI tools are not authenticated, use mock mode to test the workflow:

```bash
# Start server with mock responses
pnpm start:mock

# Open browser at http://localhost:3000
# Submit tasks - will use simulated responses for testing
```

## Prerequisites

### CLI Authentication

For the system to work with real CLI tools, ensure they are authenticated:

- **Claude CLI**: Configure API key in `~/.claude/settings.json`:
  ```json
  {
    "env": {
      "ANTHROPIC_API_KEY": "your-api-key",
      "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic"
    }
  }
  ```

- **Gemini CLI**: Ensure Google authentication is configured
- **Qoder CLI**: Configure according to Qoder documentation

## How It Works

```
1. User opens http://localhost:3000
2. User describes task in the chat interface
3. System spawns N CLI instances (default: 2x Claude)
4. Round 1: Each instance generates independent proposal
5. Round 2-3: Instances review others' proposals, refine their own
6. Consensus: Best proposal selected (or merged)
7. Results displayed in real-time on the web page
```

## Configuration

Create `.ai-cli-link.json` in your project root:

```json
{
  "nodes": [
    { "type": "claude", "count": 2 }
  ],
  "maxRounds": 3
}
```

Supported node types: `claude`, `gemini`, `qoder`

## Architecture

```
┌─────────────────────────┐
│   Web UI (Chat)          │  http://localhost:3000
│   - Task input           │
│   - Real-time monitor    │
└──────────┬──────────────┘
           │ HTTP + WebSocket
┌──────────▼──────────────┐
│   Hono Server            │  Port 3000 (HTTP)
│   - API routes           │  Port 3001 (WS)
│   - Static file serving  │
│   - Discussion orchestr  │
└──┬───────┬───────┬──────┘
   │       │       │
┌──▼──┐ ┌─▼────┐ ┌▼────┐
│C-1  │ │C-2   │ │G-1  │  CLI instances
└─────┘ └──────┘ └─────┘
```

## Project Structure

```
packages/
├── core/              # Message bus, consensus engine, types
├── adapters/          # CLI adapters + instance manager
├── server/            # Hono API + discussion orchestrator + static serving
├── web/               # React chat UI (built into server dist)
└── cli/               # Legacy CLI entry point
```

## Tech Stack

| Component    | Technology                           |
| ------------ | ------------------------------------ |
| Monorepo     | Turborepo + pnpm workspaces          |
| Language     | TypeScript (strict mode)             |
| Server       | Hono (Node.js) + WebSocket           |
| Frontend     | React + Vite + TailwindCSS           |
| Testing      | Vitest                               |
| CLI Execution| child_process.spawn (secure)         |

## Development

```bash
# Start dev servers (hot reload)
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

## License

MIT
