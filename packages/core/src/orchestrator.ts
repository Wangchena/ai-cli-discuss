import { MessageBus } from './message-bus';
import { TaskManager } from './task-manager';
import { TaskStatus } from './types';

export interface StartTaskResult {
  skipDiscussion: boolean;
}

export class Orchestrator {
  private bus: MessageBus;
  private taskManager: TaskManager;

  constructor(bus: MessageBus, taskManager: TaskManager) {
    this.bus = bus;
    this.taskManager = taskManager;
  }

  startTask(taskId: string): StartTaskResult {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.assignedNodes.length <= 1) {
      this.taskManager.updateStatus(taskId, 'executing');
      return { skipDiscussion: true };
    }

    this.taskManager.updateStatus(taskId, 'discussing');
    return { skipDiscussion: false };
  }

  areAllProposalsIn(taskId: string): boolean {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const proposals = this.bus.getMessagesByType(taskId, 'proposal');
    const proposingNodes = new Set(proposals.map((m) => m.fromNode));

    return task.assignedNodes.every((nodeId) => proposingNodes.has(nodeId));
  }

  checkTaskComplete(taskId: string): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const allDone = task.assignedNodes.every((nodeId) =>
      task.results[nodeId] !== undefined,
    );

    if (allDone) {
      this.taskManager.updateStatus(taskId, 'completed');
    }
  }

  markTaskFailed(taskId: string, reason: string): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    this.taskManager.updateStatus(taskId, 'failed');
    this.bus.publish({
      id: `decision-${Date.now()}`,
      taskId,
      fromNode: 'orchestrator',
      type: 'decision',
      content: `Task failed: ${reason}`,
      timestamp: new Date(),
    });
  }

  transitionTo(taskId: string, status: TaskStatus): void {
    this.taskManager.updateStatus(taskId, status);
  }

  getBus(): MessageBus {
    return this.bus;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }
}
