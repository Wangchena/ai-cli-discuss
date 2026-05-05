import { MessageBus, Message, TaskStatus } from '@ai-cli-link/core';
import { InstanceManager, InstanceConfig, CLIInstance } from '@ai-cli-link/adapters';
import { WsHandler } from './ws/handler';

export interface DiscussionConfig {
  nodes: InstanceConfig[];
  maxRounds?: number;
  timeoutPerRound?: number;
}

export interface ConsensusResult {
  proposal: string;
  allProposals: Message[];
  taskId: string;
}

export class DiscussionOrchestrator {
  private bus: MessageBus;
  private instanceManager: InstanceManager;
  private wsHandler: WsHandler | null;
  private currentTaskId: string | null = null;
  private maxRounds: number = 3;
  private timeoutPerRound: number = 120000;

  constructor(bus: MessageBus, wsHandler: WsHandler | null = null) {
    this.bus = bus;
    this.instanceManager = new InstanceManager();
    this.wsHandler = wsHandler;
  }

  async startDiscussion(
    task: string,
    config: DiscussionConfig
  ): Promise<ConsensusResult> {
    this.maxRounds = config.maxRounds ?? 3;
    this.timeoutPerRound = config.timeoutPerRound ?? 120000;

    // Create task
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.currentTaskId = taskId;

    this.notifyTaskUpdate(taskId, {
      id: taskId,
      title: task.slice(0, 50),
      description: task,
      status: 'discussing' as TaskStatus,
      assignedNodes: config.nodes.map((n) => n.type),
      round: 0,
      maxRounds: this.maxRounds,
    });

    // Spawn instances
    const instances = await this.instanceManager.spawnInstances(config.nodes);
    const instanceIds = instances.map((i) => i.id);

    // Round 1: Independent proposals
    const proposals = await this.collectProposals(taskId, task, instances);

    // Rounds 2-N: Mutual refinement
    let allProposals = [...proposals];
    for (let round = 2; round <= this.maxRounds; round++) {
      this.notifyTaskUpdate(taskId, { round, maxRounds: this.maxRounds });

      const context = this.buildDiscussionContext(allProposals);
      const revisions = await this.collectRevisions(taskId, context, instances);
      allProposals = [...allProposals, ...revisions];
    }

    // Reach consensus
    const consensus = this.selectBestProposal(allProposals);

    // Publish consensus message
    const consensusMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      taskId,
      fromNode: 'orchestrator',
      type: 'consensus',
      content: consensus,
      round: this.maxRounds,
      timestamp: new Date(),
    };
    this.bus.publish(consensusMessage);
    this.notifyTaskUpdate(taskId, { status: 'decided', consensus });

    return {
      proposal: consensus,
      allProposals,
      taskId,
    };
  }

  private async collectProposals(
    taskId: string,
    task: string,
    instances: CLIInstance[]
  ): Promise<Message[]> {
    const prompts = instances.map((inst) => this.buildProposalPrompt(task));

    const results = await Promise.allSettled(
      prompts.map((prompt, i) =>
        this.executeAndCapture(taskId, instances[i], prompt, 1)
      )
    );

    // Log any errors for debugging
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Instance ${instances[i].id} failed:`, r.reason);
      }
    });

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Message>).value);
  }

  private async collectRevisions(
    taskId: string,
    context: string,
    instances: CLIInstance[]
  ): Promise<Message[]> {
    const results = await Promise.allSettled(
      instances.map((inst, i) => {
        const prompt = context;
        return this.executeAndCapture(taskId, inst, prompt, 2);
      })
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Message>).value);
  }

  private buildProposalPrompt(task: string): string {
    return `Task: ${task}

Please analyze this task and propose your approach. Be specific and detailed.
Output only your proposal, no preamble.`;
  }

  private buildDiscussionContext(proposals: Message[]): string {
    return `Other participants' proposals:

${proposals
  .map((p) => `--- ${p.fromNode} (Round ${p.round}) ---\n${p.content}`)
  .join('\n\n')}

Please review the above proposals and refine/improve your own approach.
Incorporate the best ideas and address any weaknesses.
Output only your revised proposal.`;
  }

  private async executeAndCapture(
    taskId: string,
    instance: CLIInstance,
    prompt: string,
    round: number
  ): Promise<Message> {
    const output = await this.instanceManager.executeInstance(
      instance,
      prompt,
      this.timeoutPerRound
    );

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      taskId,
      fromNode: instance.id,
      type: round === 1 ? 'proposal' : 'revision',
      content: output,
      round,
      timestamp: new Date(),
    };

    this.bus.publish(message);

    return message;
  }

  private selectBestProposal(proposals: Message[]): string {
    if (proposals.length === 0) {
      return 'No proposals generated';
    }

    if (proposals.length === 1) {
      return proposals[0].content;
    }

    // Simple heuristic: prefer later rounds (more refined), then longer proposals (more detailed)
    const sorted = [...proposals].sort((a, b) => {
      if ((b.round ?? 0) !== (a.round ?? 0)) {
        return (b.round ?? 0) - (a.round ?? 0);
      }
      return b.content.length - a.content.length;
    });

    return sorted[0].content;
  }

  private notifyTaskUpdate(taskId: string, update: Record<string, unknown>): void {
    if (this.wsHandler) {
      this.wsHandler.broadcastTaskUpdate(taskId, update);
    }
  }

  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  cleanup(): void {
    this.instanceManager.cleanup();
  }
}
