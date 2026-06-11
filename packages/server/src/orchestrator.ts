import { MessageBus, Message, TaskStatus } from '@ai-cli-link/core';
import { ConsensusEngine, ConsensusResult as CoreConsensusResult } from '@ai-cli-link/core';
import { Orchestrator as CoreOrchestrator, TaskManager } from '@ai-cli-link/core';
import { InstanceManager, InstanceConfig, CLIInstance } from '@ai-cli-link/adapters';
import { WsHandler } from './ws/handler';
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface DiscussionConfig {
  nodes: InstanceConfig[];
  maxRounds?: number;
  timeoutPerRound?: number;
  taskId?: string;
  roles?: string[]; // Preset roles for each instance
  prompts?: string[]; // Custom prompts for each instance
}

export interface DiscussionHistory {
  taskId: string;
  task: string;
  config: DiscussionConfig;
  messages: Message[];
  consensus: string;
  status: 'discussing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ConsensusResult {
  proposal: string;
  allProposals: Message[];
  taskId: string;
}

const HISTORY_DIR = join(process.cwd(), '.discussion-history');

function ensureHistoryDir() {
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function saveDiscussion(history: DiscussionHistory) {
  ensureHistoryDir();
  const filePath = join(HISTORY_DIR, `${history.taskId}.json`);
  writeFileSync(filePath, JSON.stringify(history, null, 2));
}

function loadDiscussion(taskId: string): DiscussionHistory | null {
  ensureHistoryDir();
  const filePath = join(HISTORY_DIR, `${taskId}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function listDiscussions(): DiscussionHistory[] {
  ensureHistoryDir();
  const files = readdirSync(HISTORY_DIR).filter((f: string) => f.endsWith('.json'));
  return files
    .map((f: string) => JSON.parse(readFileSync(join(HISTORY_DIR, f), 'utf-8')))
    .sort((a: DiscussionHistory, b: DiscussionHistory) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export class DiscussionOrchestrator {
  private bus: MessageBus;
  private instanceManager: InstanceManager;
  private wsHandler: WsHandler | null;
  private consensusEngine: ConsensusEngine | null = null;
  private coreOrchestrator: CoreOrchestrator;
  private coreTaskManager: TaskManager;
  private currentTaskId: string | null = null;
  private maxRounds: number = 3;
  private timeoutPerRound: number = 30000;
  private discussions: Map<string, DiscussionHistory> = new Map();

  constructor(bus: MessageBus, wsHandler: WsHandler | null = null) {
    this.bus = bus;
    this.coreTaskManager = new TaskManager();
    this.coreOrchestrator = new CoreOrchestrator(bus, this.coreTaskManager);
    this.instanceManager = new InstanceManager();
    this.wsHandler = wsHandler;
  }

  async startDiscussion(
    task: string,
    config: DiscussionConfig
  ): Promise<ConsensusResult> {
    this.maxRounds = 3; // 固定最多 3 轮
    this.timeoutPerRound = config.timeoutPerRound ?? 30000;
    const totalNodes = config.nodes.reduce((sum, n) => sum + n.count, 0);
    this.consensusEngine = new ConsensusEngine(totalNodes);

    const taskId = config.taskId ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.currentTaskId = taskId;

    // Register task in core lifecycle
    const roleLabels = config.nodes.map((n, i) => config.roles?.[i] || n.type);
    const coreTask = this.coreTaskManager.createTask({
      title: task.slice(0, 100),
      description: task,
      assignedNodes: roleLabels,
    });
    // Swap generated ID with our preferred taskId
    (coreTask as any).id = taskId;
    this.coreTaskManager['tasks'].delete(coreTask.id);
    this.coreTaskManager['tasks'].set(taskId, coreTask);

    const history: DiscussionHistory = {
      taskId,
      task,
      config,
      messages: [],
      consensus: '',
      status: 'discussing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Override with same ID
    history.taskId = taskId;
    this.discussions.set(taskId, history);

    this.notifyTaskUpdate(taskId, {
      id: taskId,
      title: task.slice(0, 50),
      description: task,
      status: 'discussing' as TaskStatus,
      assignedNodes: roleLabels,
      round: 0,
      maxRounds: this.maxRounds,
    });

    const instances = await this.instanceManager.spawnInstances(config.nodes);

    let allMessages: Message[] = [];
    let hasConsensus = false;

    this.coreOrchestrator.startTask(taskId);

    for (let round = 1; round <= this.maxRounds; round++) {
      this.notifyTaskUpdate(taskId, { round, maxRounds: this.maxRounds });

      // Parallel round: run all instances concurrently
      const roundResults = await Promise.all(instances.map((instance, i) => {
        const prompt = this.buildSequentialPrompt(
          task,
          allMessages,
          instance.id,
          round,
          config.roles?.[i],
          config.prompts?.[i],
          i === 0,
          roleLabels
        );

        return this.executeAndCapture(taskId, instance, prompt, round).catch((error) => {
          console.error(`Instance ${instance.id} failed in round ${round}:`, error);
          return null as unknown as Message;
        });
      }));

      const validResults = roundResults.filter((m): m is Message => m !== null);
      allMessages.push(...validResults);
      history.messages.push(...validResults);
      history.updatedAt = new Date().toISOString();
      saveDiscussion(history);

      // Consensus check via ConsensusEngine (round 2+)
      if (round >= 2 && validResults.length > 0 && this.consensusEngine) {
        const ceResult = this.evaluateWithConsensusEngine(validResults, allMessages.filter(m => m.round === round - 1), round);
        if (ceResult.consensus) {
          this.coreOrchestrator.transitionTo(taskId, 'decided');
          hasConsensus = true;
          break;
        }
      }

      this.coreOrchestrator.transitionTo(taskId, 'discussing');
    }

    // 由第一个回答方（第一个实例）进行总结
    const firstInstance = instances[0];
    const firstRole = config.roles?.[0] || firstInstance.type;
    const summaryPrompt = this.buildSummaryPrompt(
      task,
      allMessages,
      roleLabels,
      hasConsensus
    );

    try {
      const summaryOutput = await this.instanceManager.executeInstance(
        firstInstance,
        summaryPrompt,
        this.timeoutPerRound
      );

      history.consensus = summaryOutput;
      history.status = 'completed';
      history.updatedAt = new Date().toISOString();

      const summaryMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        taskId,
        fromNode: firstInstance.id,
        type: 'consensus',
        content: summaryOutput,
        round: allMessages.length > 0 ? (allMessages[allMessages.length - 1].round ?? this.maxRounds) : this.maxRounds,
        timestamp: new Date(),
        metadata: { consensus: hasConsensus ? 'reached' : 'diverged', responderRole: firstRole },
      };

      // 将共识消息添加到消息列表，这样前端加载历史时也能看到
      history.messages.push(summaryMessage);
      saveDiscussion(history);

      this.bus.publish(summaryMessage);
      this.notifyTaskUpdate(taskId, { status: 'completed', consensus: summaryOutput, hasConsensus });

      this.coreOrchestrator.transitionTo(taskId, 'completed');

      return {
        proposal: summaryOutput,
        allProposals: allMessages,
        taskId,
      };
    } catch (error) {
      console.error('Summary generation failed:', error);
      // Fallback: 使用之前的选择逻辑
      const fallback = this.selectBestProposal(allMessages);
      history.consensus = fallback;
      history.status = 'completed';

      const fallbackMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        taskId,
        fromNode: firstInstance.id,
        type: 'consensus',
        content: fallback,
        round: allMessages.length > 0 ? (allMessages[allMessages.length - 1].round ?? this.maxRounds) : this.maxRounds,
        timestamp: new Date(),
        metadata: { consensus: 'fallback', responderRole: firstRole },
      };
      history.messages.push(fallbackMessage);
      saveDiscussion(history);

      this.bus.publish(fallbackMessage);
      this.notifyTaskUpdate(taskId, { status: 'completed', consensus: fallback });

      this.coreOrchestrator.transitionTo(taskId, 'failed');

      return { proposal: fallback, allProposals: allMessages, taskId };
    }
  }

  private evaluateWithConsensusEngine(
    currentRoundMessages: Message[],
    previousRoundMessages: Message[],
    round: number
  ): CoreConsensusResult {
    if (!this.consensusEngine || currentRoundMessages.length === 0) {
      return { winnerId: null, consensus: false, round } satisfies CoreConsensusResult;
    }

    // Build Vote array from explicit cross-references and self-votes
    const votesByNode: Map<string, Set<string>> = new Map();

    // Self-votes
    for (const msg of currentRoundMessages) {
      if (!votesByNode.has(msg.fromNode)) {
        votesByNode.set(msg.fromNode, new Set());
      }
      votesByNode.get(msg.fromNode)!.add(msg.id);
    }

    // Detect cross-agreement
    const agreementPatterns = ['i agree', 'i concur', '+1', '同意', '赞同', '支持', '认可', 'agreed', 'second'];
    for (const msg of currentRoundMessages) {
      const lower = msg.content.toLowerCase();
      const mentionsAgreement = agreementPatterns.some(p => lower.includes(p));

      if (mentionsAgreement) {
        for (const prev of previousRoundMessages) {
          const namePatterns = [prev.fromNode.toLowerCase(), prev.fromNode.split('-').pop() || ''];
          const nameMatch = namePatterns.some(n => n.length > 1 && lower.includes(n));
          if (nameMatch) {
            votesByNode.get(msg.fromNode)?.add(prev.id);
          }
        }
      }
    }

    const votes = Array.from(votesByNode.entries()).flatMap(([nodeId, proposalIds]) =>
      Array.from(proposalIds).map(proposalMessageId => ({
        nodeId,
        taskId: currentRoundMessages[0].taskId,
        proposalMessageId,
      }))
    );

    return this.consensusEngine.evaluate(currentRoundMessages, votes, round, this.maxRounds);
  }

  async continueDiscussion(taskId: string, userMessage: string): Promise<ConsensusResult> {
    const history = loadDiscussion(taskId);
    if (!history) {
      throw new Error('Discussion not found');
    }

    // Add user message to history
    const userMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      taskId,
      fromNode: 'user',
      type: 'proposal',
      content: userMessage,
      round: (history.messages.length > 0 ? (history.messages[history.messages.length - 1].round ?? 0) + 1 : 1),
      timestamp: new Date(),
    };
    history.messages.push(userMsg);

    // Notify via WebSocket
    if (this.wsHandler) {
      this.wsHandler.broadcastToTask(taskId, userMsg);
    }

    // Spawn instances for response
    const instances = await this.instanceManager.spawnInstances(history.config.nodes);
    const round = userMsg.round!;

    // Parallel responses for continue
    await Promise.all(instances.map(async (instance, i) => {
      const prompt = this.buildSequentialPrompt(
        history.task,
        history.messages,
        instance.id,
        round,
        history.config.roles?.[i]
      );

      const message = await this.executeAndCapture(taskId, instance, prompt, round).catch((error) => {
        console.error(`Instance ${instance.id} failed:`, error);
        return null as unknown as Message;
      });
      if (message) {
        history.messages.push(message);
      }
    }));
    history.updatedAt = new Date().toISOString();
    saveDiscussion(history);

    return {
      proposal: '',
      allProposals: history.messages,
      taskId,
    };
  }

  getDiscussionHistory(taskId: string): DiscussionHistory | null {
    return loadDiscussion(taskId) || this.discussions.get(taskId) || null;
  }

  listDiscussions(): DiscussionHistory[] {
    return listDiscussions();
  }

  private buildSequentialPrompt(
    task: string,
    previousMessages: Message[],
    currentInstanceId: string,
    round: number,
    role?: string,
    customPrompt?: string,
    isSummaryResponsible?: boolean,
    allRoles?: string[]
  ): string {
    const contextPrefix = customPrompt
      ? `${customPrompt}\n\n`
      : (role ? `[角色: ${role}]\n\n` : '');

    if (previousMessages.length === 0) {
      return `${contextPrefix}Task: ${task}

Please analyze this task from your professional perspective. Be specific and provide actionable conclusions.
You must give a clear conclusion or recommendation at the end of your response.

IMPORTANT: Output your response in Markdown format. Use:
- ## and ### for headings
- - or * for bullet points
- **bold** for emphasis
- \`\`\` for code blocks
- | tables | for data tables

Output only your analysis and conclusion, no preamble.`;
    }

    const conversation = previousMessages
      .map((m) => {
        const senderLabel = m.fromNode === 'user' ? '用户' : (allRoles?.[parseInt(m.fromNode.split('-')[1]) - 1] || m.fromNode);
        return `${senderLabel}: ${m.content}`;
      })
      .join('\n\n');

    const turnInstructions = round >= 3
      ? 'This is the final round. You must provide your final position and conclusion.'
      : 'Please respond based on the discussion above. Address others\' points directly. Build on good ideas and politely challenge weak ones.';

    return `${contextPrefix}This is a group discussion. All participants can see the full conversation.

Task: ${task}

--- Conversation History ---

${conversation}

---

${turnInstructions}
You must give a clear conclusion or recommendation at the end of your response.

IMPORTANT: Output your response in Markdown format. Use:
- ## and ### for headings
- - or * for bullet points
- **bold** for emphasis
- \`\`\` for code blocks
- | tables | for data tables

Output only your response, no preamble.`;
  }

  private buildSummaryPrompt(
    task: string,
    allMessages: Message[],
    roles: string[],
    hasConsensus: boolean
  ): string {
    const conversation = allMessages
      .map((m) => {
        const senderLabel = m.fromNode === 'user' ? '用户' : (roles[parseInt(m.fromNode.split('-')[1]) - 1] || m.fromNode);
        return `${senderLabel}: ${m.content}`;
      })
      .join('\n\n');

    if (hasConsensus) {
      return `You are the discussion leader. The group has reached consensus.

Task: ${task}

--- Full Discussion ---

${conversation}

Please summarize the consensus. Include:
1. The agreed-upon approach/solution
2. Key decisions made
3. Next steps or recommendations

IMPORTANT: Output in Markdown format. Use:
- ## and ### for headings
- - or * for bullet points
- **bold** for emphasis
- | tables | for data tables

Keep it concise but comprehensive.`;
    } else {
      return `You are the discussion leader. The group could not reach full consensus after 3 rounds.

Task: ${task}

--- Full Discussion ---

${conversation}

Please summarize:
1. Common points that everyone agreed on
2. Key 分歧点 (divergence points) - where and why opinions differed
3. Ask the user to confirm which direction to proceed

IMPORTANT: Output in Markdown format. Use:
- ## and ### for headings
- - or * for bullet points
- **bold** for emphasis
- | tables | for data tables

Present this clearly so the user can make an informed decision.`;
    }
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

    if (this.wsHandler) {
      this.wsHandler.broadcastToTask(taskId, message);
    }

    return message;
  }

  private selectBestProposal(proposals: Message[]): string {
    if (proposals.length === 0) return 'No proposals generated';
    if (proposals.length === 1) return proposals[0].content;

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
    this.consensusEngine = null;
  }
}
