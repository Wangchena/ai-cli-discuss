---
title: Discussion Orchestrator
created: '2026-05-05'
updated: '2026-05-05'
description: How the DiscussionOrchestrator coordinates multi-instance discussions
tags:
  - orchestrator
  - discussion
  - consensus
---

# Discussion Orchestrator

## Overview

The `DiscussionOrchestrator` class in `packages/server/src/orchestrator.ts` coordinates the entire discussion flow between multiple CLI instances.

## Key Components

```typescript
class DiscussionOrchestrator {
  private bus: MessageBus;           // Event pub/sub
  private instanceManager: InstanceManager;  // CLI instance management
  private wsHandler: WsHandler | null;       // WebSocket for real-time
  private currentTaskId: string | null;      // Active task
  private maxRounds: number;                 // Max discussion rounds (default 3)
  private timeoutPerRound: number;           // Timeout per round (default 120s)
}
```

## Main Flow: startDiscussion()

```typescript
async startDiscussion(task: string, config: DiscussionConfig): Promise<ConsensusResult> {
  // 1. Create task and notify via WebSocket
  // 2. Spawn CLI instances via InstanceManager
  // 3. Round 1: Collect independent proposals
  // 4. Round 2-N: Collect revisions with context
  // 5. Select best proposal as consensus
  // 6. Publish consensus message
  // 7. Return result
}
```

## Proposal Collection

```typescript
private async collectProposals(taskId, task, instances): Promise<Message[]> {
  // Build prompts for each instance
  const prompts = instances.map(inst => this.buildProposalPrompt(task));
  
  // Execute all instances in parallel
  const results = await Promise.allSettled(
    prompts.map((prompt, i) => this.executeAndCapture(taskId, instances[i], prompt, 1))
  );
  
  // Filter successful results
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}
```

## Instance Execution

```typescript
private async executeAndCapture(taskId, instance, prompt, round): Promise<Message> {
  // Execute CLI instance with timeout
  const output = await this.instanceManager.executeInstance(instance, prompt, this.timeoutPerRound);
  
  // Create message
  const message: Message = {
    id: generateId(),
    taskId,
    fromNode: instance.id,
    type: round === 1 ? 'proposal' : 'revision',
    content: output,
    round,
    timestamp: new Date()
  };
  
  // Publish to message bus
  this.bus.publish(message);
  
  return message;
}
```

## Revision Collection

Similar to proposal collection, but uses discussion context:

```typescript
private async collectRevisions(taskId, context, instances): Promise<Message[]> {
  // Each instance receives others' proposals as context
  // Instances refine their own proposals
}
```

## Consensus Selection

```typescript
private selectBestProposal(proposals: Message[]): string {
  if (proposals.length === 0) return 'No proposals generated';
  if (proposals.length === 1) return proposals[0].content;
  
  // Sort by: 1) Later rounds first, 2) Longer content first
  const sorted = [...proposals].sort((a, b) => {
    if ((b.round ?? 0) !== (a.round ?? 0)) {
      return (b.round ?? 0) - (a.round ?? 0);
    }
    return b.content.length - a.content.length;
  });
  
  return sorted[0].content;
}
```

## Mock Mode

When `MOCK_MODE=1` environment variable is set:

```typescript
// InstanceManager.executeInstance()
if (MOCK_MODE) {
  await sleep(1000);  // Simulate processing time
  return `[${instance.id} MOCK] Analysis of: "..."
  
Proposal:
1. Analyze requirements thoroughly
2. Design modular architecture
3. Implement with test-driven development
4. Review and refine based on feedback`;
}
```

## Error Handling

- `Promise.allSettled()` ensures one failing instance doesn't block others
- Failed instances are logged via `console.error()`
- Timeout after 120 seconds per round
- Graceful degradation: continues with successful instances

## See Also

- [[message-protocol]] - Message types and flow
- [[project-overview]] - Project overview
- [[claude-auth-fix]] - Authentication and mock mode
- [[ai-cli-link-architecture]] - System architecture