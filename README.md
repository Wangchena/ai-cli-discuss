# AI-CLI-Link

A multi-CLI orchestration system that allows you to input a single requirement, automatically launches multiple AI CLI instances (Claude, Gemini, Qoder) for discussion and mutual refinement, reaches consensus through a shared message bus, and collaboratively executes the task upon your confirmation.

## Features

- **One-Command Launch**: `ai-cli-link "your task"` - that's it
- **Multi-Instance Discussion**: Automatically spawns 2+ CLI instances that generate proposals, review each other's work, and refine approaches through 2-3 rounds
- **Consensus Engine**: Majority voting with configurable rounds, automatic merge of best ideas
- **Web Monitor**: Real-time discussion stream and consensus display at `http://localhost:3000`
- **Secure Execution**: Uses `child_process.spawn()` instead of `exec()` to prevent shell injection

## Quick Start

```bash
# Install dependencies
pnpm install

# Run a task
pnpm start -- "Refactor packages/core to improve code quality"
```

Or use the CLI directly after building:

```bash
pnpm build
./packages/cli/dist/index.js "Analyze the security of our API"
```

## How It Works

```
1. User inputs task via CLI
2. System spawns N CLI instances (default: 2x Claude)
3. Round 1: Each instance generates independent proposal
4. Round 2-3: Instances review others' proposals, refine their own
5. Consensus: Best proposal selected (or merged)
6. Web Monitor: Real-time discussion stream displayed
7. Result: Consensus saved to ai-cli-link-result.json
```

## Configuration

Create `.ai-cli-link.json` in your project root:

```json
{
  "nodes": [
    { "type": "claude", "count": 2 }
  ],
  "maxRounds": 3,
  "port": 3000
}
```

Supported node types: `claude`, `gemini`, `qoder`

## Architecture

```
┌─────────────────┐
│   CLI Entry      │  ai-cli-link "task"
└────────┬────────┘
         │
┌────────▼──────────────┐
│  Discussion Orchestrator │
│  - InstanceManager      │
│  - MessageBus           │
│  - ConsensusEngine      │
└──┬───────┬───────┬─────┘
   │       │       │
┌──▼──┐ ┌─▼────┐ ┌▼────┐
│C-1  │ │C-2   │ │G-1  │  CLI instances
└─────┘ └──────┘ └─────┘
         │
┌────────▼───────────┐
│  Web Monitor       │  http://localhost:3000
└────────────────────┘
```

## Project Structure

```
packages/
├── core/              # Message bus, consensus engine, types
├── adapters/          # CLI adapters + instance manager
├── server/            # Hono API + discussion orchestrator
├── web/               # Single-page monitor (React + Vite)
└── cli/               # Command-line entry point
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
# Start dev servers
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Type check
pnpm typecheck
```

## License

MIT
