---
title: Message Protocol
created: '2026-05-05'
updated: '2026-05-05'
description: Message types and discussion flow for AI-CLI-Link
tags:
  - protocol
  - messages
  - discussion
---

# Message Protocol

## Message Interface

```typescript
interface Message {
  id: string;              // Unique message ID
  taskId: string;          // Associated task ID
  fromNode: string;        // Instance ID (e.g., "claude-1")
  type: MessageType;       // Message type
  content: string;         // Message content
  round?: number;          // Discussion round (1, 2, 3)
  replyTo?: string;        // ID of message being replied to
  timestamp: Date;         // Creation time
}

type MessageType = 
  | 'proposal'    // Initial proposal (Round 1)
  | 'revision'    // Revised proposal (Round 2+)
  | 'comment'     // Comment on other proposals
  | 'vote'        // Vote for a proposal
  | 'consensus'   // Final consensus result
  | 'decision'    // User decision
  | 'result';     // Execution result
```

## Discussion Rounds

### Round 1: Independent Proposals

Each CLI instance generates an independent proposal based on the task.

**Prompt**:
```
Task: {task}

Please analyze this task and propose your approach. Be specific and detailed.
Output only your proposal, no preamble.
```

**Message Type**: `proposal`
**Round**: 1

### Round 2-N: Mutual Refinement

Each instance sees other proposals and refines its own.

**Prompt**:
```
Other participants' proposals:

--- claude-1 (Round 1) ---
{proposal content}

--- claude-2 (Round 1) ---
{proposal content}

Please review the above proposals and refine/improve your own approach.
Incorporate the best ideas and address any weaknesses.
Output only your revised proposal.
```

**Message Type**: `revision`
**Round**: 2, 3, ...

### Consensus Selection

After all rounds complete, the orchestrator selects the best proposal:

1. Prefers later rounds (more refined)
2. Among same round, prefers longer proposals (more detailed)
3. Publishes `consensus` message

## Example Message Flow

```
[claude-1] proposal (Round 1): "Use factory pattern..."
[claude-2] proposal (Round 1): "Use strategy pattern..."
[claude-1] revision (Round 2): "Adopt strategy pattern, but add..."
[claude-2] revision (Round 2): "Combine both patterns..."
[orchestrator] consensus: "Combined: Strategy + Factory hybrid..."
```

## WebSocket Events

The server broadcasts updates via WebSocket:

```typescript
// Task update
taskUpdate: {
  taskId: string;
  round?: number;
  maxRounds?: number;
  status?: TaskStatus;
  consensus?: string;
}

// New message
newMessage: Message;
```

## See Also

- [[project-overview]] - Project overview
- [[discussion-orchestrator]] - Orchestrator implementation
- [[ai-cli-link-architecture]] - System architecture