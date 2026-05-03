import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../src/task-manager';

describe('TaskManager', () => {
  let manager: TaskManager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  it('should create a task with pending status', () => {
    const task = manager.createTask({
      title: 'Test Task',
      description: 'A test task',
      assignedNodes: ['node-a', 'node-b'],
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe('pending');
    expect(task.assignedNodes).toEqual(['node-a', 'node-b']);
    expect(task.results).toEqual({});
  });

  it('should update task status', () => {
    const task = manager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    manager.updateStatus(task.id, 'discussing');
    const updated = manager.getTask(task.id)!;
    expect(updated.status).toBe('discussing');
  });

  it('should get all tasks', () => {
    manager.createTask({ title: 'A', description: '', assignedNodes: [] });
    manager.createTask({ title: 'B', description: '', assignedNodes: [] });

    expect(manager.getAllTasks()).toHaveLength(2);
  });

  it('should return undefined for non-existent task', () => {
    expect(manager.getTask('nonexistent')).toBeUndefined();
  });

  it('should set final plan', () => {
    const task = manager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    manager.setFinalPlan(task.id, 'The chosen plan');
    expect(manager.getTask(task.id)!.finalPlan).toBe('The chosen plan');
  });

  it('should set result for a node', () => {
    const task = manager.createTask({
      title: 'Test',
      description: 'Test',
      assignedNodes: ['node-a'],
    });

    manager.setNodeResult(task.id, 'node-a', 'Done coding');
    expect(manager.getTask(task.id)!.results['node-a']).toBe('Done coding');
  });
});
