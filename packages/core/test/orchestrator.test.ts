import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../src/orchestrator';
import { MessageBus } from '../src/message-bus';
import { TaskManager } from '../src/task-manager';
import { Message } from '../src/types';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let bus: MessageBus;
  let taskManager: TaskManager;

  beforeEach(() => {
    bus = new MessageBus();
    taskManager = new TaskManager();
    orchestrator = new Orchestrator(bus, taskManager);
  });

  it('should start a task and set status to discussing', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test task',
      assignedNodes: ['node-a', 'node-b'],
    });

    orchestrator.startTask(task.id);
    expect(taskManager.getTask(task.id)!.status).toBe('discussing');
  });

  it('should skip discussion for single node tasks', () => {
    const task = taskManager.createTask({
      title: 'Single',
      description: 'Single node',
      assignedNodes: ['node-a'],
    });

    const result = orchestrator.startTask(task.id);
    expect(taskManager.getTask(task.id)!.status).toBe('executing');
    expect(result.skipDiscussion).toBe(true);
  });

  it('should collect proposals and detect when all nodes have submitted', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a', 'node-b'],
    });

    orchestrator.startTask(task.id);

    bus.publish({
      id: 'p1',
      taskId: task.id,
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Plan A',
      timestamp: new Date(),
    });

    expect(orchestrator.areAllProposalsIn(task.id)).toBe(false);

    bus.publish({
      id: 'p2',
      taskId: task.id,
      fromNode: 'node-b',
      type: 'proposal',
      content: 'Plan B',
      timestamp: new Date(),
    });

    expect(orchestrator.areAllProposalsIn(task.id)).toBe(true);
  });

  it('should complete task when all nodes report results', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a', 'node-b'],
    });

    taskManager.setFinalPlan(task.id, 'Plan');
    taskManager.updateStatus(task.id, 'executing');

    taskManager.setNodeResult(task.id, 'node-a', 'Result A');
    expect(taskManager.getTask(task.id)!.status).toBe('executing');

    taskManager.setNodeResult(task.id, 'node-b', 'Result B');
    orchestrator.checkTaskComplete(task.id);
    expect(taskManager.getTask(task.id)!.status).toBe('completed');
  });

  it('should mark task as failed on error', () => {
    const task = taskManager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    taskManager.updateStatus(task.id, 'executing');
    orchestrator.markTaskFailed(task.id, 'Node crashed');
    expect(taskManager.getTask(task.id)!.status).toBe('failed');
  });
});
