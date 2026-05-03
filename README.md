# AI-CLI-Link

A multi-CLI orchestration system that allows you to register AI CLI tools (Qoder, Claude, Gemini) as nodes, send tasks, let them discuss and reach consensus through a shared message bus, and execute sub-tasks in parallel.

## Features

- **Node Registration**: Register multiple AI CLI tools (Qoder, Claude, Gemini) as orchestrated nodes
- **Shared Message Bus**: Forum-style discussion system where nodes communicate proposals and feedback
- **Consensus Engine**: Majority voting algorithm with configurable rounds to reach agreement on task approaches
- **Parallel Execution**: Execute approved sub-tasks across multiple CLI nodes simultaneously
- **Web Dashboard**: React-based UI for node management, task canvas, and real-time monitoring
- **WebSocket Integration**: Live streaming of messages and task status updates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Dashboard                        │
│  (Node Management | Task Canvas | Monitoring Panel)     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                    Hono Server                          │
│  (REST API | WebSocket Handler | Orchestrator)          │
└──┬────────────┬────────────┬────────────────────────────┘
   │            │            │
┌──▼──┐  ┌─────▼─────┐  ┌───▼────┐
│Qoder│  │  Claude   │  │ Gemini │
└─────┘  └───────────┘  └────────┘
```

### Workflow

1. **Register Nodes**: Add CLI tools through the Node Management page
2. **Create Task**: Define a task with sub-tasks on the Task Canvas
3. **Proposal Phase**: Each node analyzes the task and submits its approach via the message bus
4. **Discussion & Consensus**: Nodes review each other's proposals, vote, and reach agreement through the consensus engine
5. **Parallel Execution**: Once consensus is reached, all nodes execute their assigned sub-tasks simultaneously

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- AI CLI tools installed and configured (qoder, claude, gemini)

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers (server + web)
pnpm dev
```

The web dashboard will be available at `http://localhost:5173` and the API server at `http://localhost:3000`.

### Build for Production

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

## Tech Stack

| Component    | Technology                           |
| ------------ | ------------------------------------ |
| Monorepo     | Turborepo + pnpm workspaces          |
| Language     | TypeScript (strict mode)             |
| Server       | Hono (Node.js) + WebSocket           |
| Frontend     | React + Vite + TailwindCSS           |
| Visual Editor| React Flow                           |
| Testing      | Vitest                               |
| CLI Execution| child_process.spawn (secure)         |

## Project Structure

```
ai-cli-link/
├── packages/
│   ├── core/         # Domain types, message bus, consensus, task manager, orchestrator
│   ├── adapters/     # CLI tool adapters (Qoder, Claude, Gemini)
│   ├── server/       # Hono HTTP/WS server with API routes
│   └── web/          # React web dashboard
├── docs/             # Design specifications and plans
└── turbo.json        # Turborepo configuration
```

## Message Bus Protocol

Nodes communicate using typed messages on a shared, in-memory message bus:

- **proposal**: A node's suggested approach for a task
- **feedback**: Comments or critiques on another node's proposal
- **vote**: A node's vote for a specific proposal
- **decision**: The final agreed-upon approach after consensus

Messages are task-scoped and chronologically ordered, enabling structured discussions.

## Consensus Algorithm

The consensus engine uses majority voting:

- **Quorum**: floor(n/2) + 1 votes required
- **Maximum Rounds**: 3 (configurable)
- **Forced Decision**: If no majority after max rounds, the first proposal wins
- **Tie-breaking**: Chronological order of proposals

## License

MIT
