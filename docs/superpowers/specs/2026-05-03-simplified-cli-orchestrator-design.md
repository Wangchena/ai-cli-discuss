# Simplified CLI Orchestrator Design Document

## Overview

Refactor the existing AI-CLI-Link system into a **lightweight orchestrator mode** where users input a single requirement via command line, the system automatically launches multiple CLI instances for discussion and mutual refinement, reaches consensus, presents the方案 to the user for review, and upon confirmation, collaboratively executes the task.

**Core simplifications:**
- Remove complex Web UI features (node management, task canvas)
- Retain core logic: message bus + consensus engine + CLI adapters
- Add minimal CLI entry point + lightweight Web monitoring page

**Usage flow:**
```bash
# User input
ai-cli-link "Refactor packages/core to improve code quality"

# System automatically:
# 1. Launches 2 Claude instances
# 2. Each generates a proposal -> exchanges -> mutually refines (2-3 rounds)
# 3. Reaches consensus -> pushes proposal to Web
# 4. Waits for user confirmation
# 5. Executes task collaboratively upon approval
```

## Architecture

```
┌─────────────────────┐
│   CLI Entry Point    │  User inputs requirement
└──────────┬──────────┘
           │
┌──────────▼──────────────┐
│   Orchestrator          │
│  - Spawn CLI instances  │
│  - Collect proposals    │
│  - Message bus dispatch │
│  - Consensus decision   │
└──┬───────┬───────┬─────┘
   │       │       │
┌──▼──┐ ┌─▼────┐ ┌▼────┐
│C-1  │ │C-2   │ │G-1  │  CLI instances
└──┬──┘ └─┬────┘ └┬────┘
   │      │       │
   └──────┼───────┘
          │
┌─────────▼───────────┐
│  Web Monitor Page   │  View discussion, confirm proposal
│  (Single page app)  │
└─────────────────────┘
```

**Comparison with existing architecture:**

| Component | Existing System | New Design |
|-----------|----------------|------------|
| Entry point | Web UI operations | CLI one-command launch |
| Web UI | Full dashboard | Single-page monitor |
| Node registration | Manual configuration | Auto-spawn instances |
| Discussion control | Manual message sending | Auto-scheduled |
| Core logic | Full retention | Reuse + streamline |

## Data Flow

```
1. User input -> CLI entry creates task
2. Orchestrator spawns N CLI instances (default 2)
3. Each instance executes independently -> generates initial proposal
4. Orchestrator collects all proposals -> publishes to message bus
5. Orchestrator feeds other instances' proposals as context
6. Instances read others' proposals -> generate revisions
7. Repeat 2-3 rounds -> proposals converge
8. Orchestrator triggers voting -> reaches consensus
9. Consensus proposal pushed to Web monitor page
10. User reviews -> confirms/rejects
11. Upon confirmation -> orchestrator splits task -> parallel execution
12. Collect results -> display completion status
```

## Message Protocol

Reuses existing message bus with simplified message types:

```typescript
interface Message {
  id: string;
  taskId: string;
  fromNode: string;          // Instance ID, e.g., "claude-1", "claude-2"
  type: MessageType;
  content: string;           // Proposal/revision/vote content
  round: number;             // Discussion round (1, 2, 3)
  timestamp: Date;
}

type MessageType = 
  | 'proposal'    // Initial proposal
  | 'revision'    // Revision based on others' proposals
  | 'vote'        // Vote
  | 'consensus'   // Consensus result
  | 'result';     // Execution result
```

### Discussion Round Control

```
Round 1: Each instance generates independent proposal -> submits proposal
Round 2: Each instance sees others' proposals -> submits revision (refines own)
Round 3: Final revision -> submits revision -> triggers voting
Voting:  Orchestrator tallies -> selects optimal proposal (or merges)
Consensus: Publishes consensus message
```

**Voting rules:**
- Each instance votes for own proposal with weight 0.5, others' with weight 1.0
- Prevents self-preference bias
- If no clear convergence after 3 rounds, orchestrator merges most similar proposals

## CLI Instance Management

**Core challenge:** How to launch multiple instances of the same CLI type with isolated sessions?

**Solution:**

```typescript
interface CLIInstance {
  id: string;              // e.g., "claude-1", "claude-2"
  type: 'claude' | 'gemini' | 'qoder';
  workDir: string;         // Independent working directory (temporary)
  childProcess: ChildProcess;
  status: 'idle' | 'running' | 'done' | 'error';
}

// Instance creation flow
function createInstance(type: string, instanceNum: number): CLIInstance {
  const id = `${type}-${instanceNum}`;
  const workDir = mkdtempSync(`/tmp/ai-cli-link-${id}-`);
  
  // Symlink project files to temp directory (read-only access to original)
  symlinkSync(projectRoot, join(workDir, 'project'), 'dir');
  
  // Launch CLI process
  const child = spawn(type, ['-p', prompt, '--output-format', 'json'], {
    cwd: workDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  return { id, type, workDir, childProcess: child, status: 'running' };
}
```

**Isolation strategy:**
- Each instance uses independent temp directory
- Symlink to original project (read-only)
- Output captured via stdout, no file writes

## Orchestrator Design

```typescript
class DiscussionOrchestrator {
  private bus: MessageBus;
  private instances: CLIInstance[];
  private maxRounds: number = 3;
  private currentRound: number = 0;

  // Main flow entry point
  async startDiscussion(task: string, nodeConfig: NodeConfig): Promise<ConsensusResult> {
    // 1. Spawn instances
    this.instances = this.spawnInstances(nodeConfig);
    
    // 2. Round 1: Independent proposals
    const proposals = await this.collectProposals(task);
    
    // 3. Intermediate rounds: Mutual refinement
    for (let round = 2; round <= this.maxRounds; round++) {
      this.currentRound = round;
      const context = this.buildDiscussionContext(proposals);
      const revisions = await this.collectRevisions(context);
      proposals.push(...revisions);
    }
    
    // 4. Voting and consensus
    return this.reachConsensus(proposals);
  }

  // Collect proposals (parallel execution)
  private async collectProposals(task: string): Promise<Message[]> {
    const prompts = this.instances.map(inst => 
      this.buildProposalPrompt(inst, task)
    );
    
    return Promise.all(
      prompts.map((prompt, i) => this.executeAndCapture(this.instances[i], prompt))
    );
  }

  // Build discussion context
  private buildDiscussionContext(allProposals: Message[]): string {
    return `
      Other participants' proposals:
      ${allProposals.map(p => `--- ${p.fromNode} ---\n${p.content}`).join('\n\n')}
      
      Please refine and optimize your own proposal based on the above.
    `;
  }

  // Execute CLI and capture output
  private async executeAndCapture(
    instance: CLIInstance, 
    prompt: string
  ): Promise<Message> {
    const output = await this.runWithTimeout(instance, prompt, 120000);
    return {
      id: generateId(),
      taskId: this.taskId,
      fromNode: instance.id,
      type: this.currentRound === 1 ? 'proposal' : 'revision',
      content: output,
      round: this.currentRound,
      timestamp: new Date()
    };
  }
}
```

**Key points:**
- All instances execute **in parallel** (not serial)
- Timeout control: 120 seconds per round max
- Output parsing: expects JSON format, falls back to plain text on failure

## Web Monitor Page

**Minimal design:** Single page application with only the following features

```
┌──────────────────────────────────────────────┐
│  AI-CLI-Link Task Monitor                     │
├──────────────────────────────────────────────┤
│                                              │
│  Task: Refactor packages/core                │
│  Status: ● Discussing (Round 2/3)             │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Real-time Discussion Stream            │  │
│  │                                        │  │
│  │  [claude-1] Proposal A (Round 1)        │  │
│  │  Recommend using strategy pattern...     │  │
│  │                                        │  │
│  │  [claude-2] Proposal B (Round 1)        │  │
│  │  Recommend using factory pattern...      │  │
│  │                                        │  │
│  │  [claude-1] Revised Proposal (Round 2)  │  │
│  │  Adopt factory pattern, but add...       │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Consensus Proposal                     │  │
│  │                                        │  │
│  │  Combined: Factory + Strategy hybrid...  │  │
│  │                                        │  │
│  │  [ Execute ]  [ Reject & Rediscuss ]     │  │
│  └────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

**Technical implementation:**
- React + Vite (reused from existing)
- Server-Sent Events (SSE) or WebSocket for real-time updates
- No routing, single page

## Error Handling

| Error scenario | Handling strategy |
|---------------|-------------------|
| CLI instance fails to start | Auto-retry once -> if still fails, degrade to single-instance mode |
| Single instance timeout | Kill process -> mark instance as no output for round -> continue others |
| All instances timeout | Use best available proposal (from round 1) |
| CLI output parsing fails | Plain text fallback -> log warning -> continue flow |
| User doesn't confirm for long time | 10 min no response -> push notification (terminal + Web) |
| Partial failure during execution | Mark failed sub-task -> other instances can attempt takeover |

## Consensus Merge Strategy

When multiple proposals each have strengths, orchestrator can execute **proposal merging**:

```typescript
function mergeProposals(proposals: Message[]): string {
  // Simple implementation: concatenate all proposals, let orchestrator instance summarize
  const mergePrompt = `
    Synthesize the following proposals, extracting common strengths, to form a final proposal:
    ${proposals.map(p => `--- ${p.fromNode} (Round ${p.round}) ---\n${p.content}`).join('\n\n')}
  `;
  
  // Spawn a temporary instance for summarization
  return executeMergeInstance(mergePrompt);
}
```

## Project Refactoring Plan

### Keep vs Delete

| Existing Component | Action | Reason |
|-------------------|--------|--------|
| `packages/core` | ✅ Keep & streamline | Message bus, consensus engine, type definitions still needed |
| `packages/adapters` | ✅ Keep & enhance | Need new instance management, output parsing capabilities |
| `packages/server` | 🔄 Refactor | Simplify API, add SSE/WS push |
| `packages/web` | 🔄 Refactor | Simplify to single-page monitor |
| Web routing system | ❌ Delete | No longer need multi-page |
| Node registration API | ❌ Delete | Replaced by auto-spawn instances |
| React Flow | ❌ Delete | No longer need visual editor |

### New Project Structure

```
packages/
├── core/              # Streamlined
│   └── src/
│       ├── types.ts
│       ├── message-bus.ts
│       ├── consensus.ts
│       └── index.ts
│
├── adapters/          # Enhanced
│   └── src/
│       ├── base-adapter.ts
│       ├── claude-adapter.ts
│       ├── gemini-adapter.ts
│       └── instance-manager.ts   ← NEW
│
├── server/            # Refactored
│   └── src/
│       ├── api.ts              ← Simplified
│       ├── orchestrator.ts     ← NEW discussion orchestration
│       └── index.ts
│
├── web/               # Refactored to single page
│   └── src/
│       ├── App.tsx             ← Single page
│       ├── components/
│       │   ├── DiscussionStream.tsx
│       │   ├── ConsensusPanel.tsx
│       │   └── ExecutionStatus.tsx
│       └── hooks/useTaskStream.ts
│
└── cli/               ← NEW CLI entry
    └── src/
        ├── index.ts            ← CLI entry point
        └── config.ts
```

## CLI Entry Point

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node

import { DiscussionOrchestrator } from '@ai-cli-link/server';
import { startServer } from '@ai-cli-link/server';

async function main() {
  const args = process.argv.slice(2);
  const task = args.join(' ');
  
  if (!task) {
    console.log('Usage: ai-cli-link "your task description"');
    process.exit(1);
  }
  
  // 1. Start Web monitoring
  const server = await startServer();
  console.log(`Monitor page: http://localhost:${server.port}`);
  
  // 2. Create discussion orchestrator
  const orchestrator = new DiscussionOrchestrator();
  
  // 3. Start discussion
  console.log('Launching Claude instances...');
  const consensus = await orchestrator.startDiscussion(task, {
    nodes: [
      { type: 'claude', count: 2 }
    ],
    maxRounds: 3
  });
  
  // 4. Push proposal to Web, wait for user confirmation
  console.log('Proposal generated, please review in browser...');
  const approved = await orchestrator.waitForUserApproval();
  
  if (approved) {
    console.log('Executing task...');
    await orchestrator.executeTask(consensus);
    console.log('Task completed!');
  } else {
    console.log('Task rejected');
  }
  
  process.exit(0);
}

main().catch(console.error);
```

## Technology Stack

| Category       | Choice                          |
| -------------- | ------------------------------- |
| Monorepo       | Turborepo                       |
| Package Manager| pnpm                            |
| Backend        | Hono (lightweight HTTP + WS)    |
| Frontend       | React + Vite                    |
| Styling        | TailwindCSS                     |
| Type Checking  | TypeScript                      |
| CLI Execution  | child_process.spawn (secure)    |
