import { Task, TaskStatus } from './types';

interface CreateTaskInput {
  title: string;
  description: string;
  assignedNodes: string[];
}

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map();

  createTask(input: CreateTaskInput): Task {
    const now = new Date();
    const task: Task = {
      id: generateId(),
      title: input.title,
      description: input.description,
      status: 'pending',
      assignedNodes: input.assignedNodes,
      results: {},
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateStatus(id: string, status: TaskStatus): void {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.status = status;
    task.updatedAt = new Date();
  }

  setFinalPlan(id: string, plan: string): void {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.finalPlan = plan;
    task.updatedAt = new Date();
  }

  setNodeResult(id: string, nodeId: string, result: string): void {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.results[nodeId] = result;
    task.updatedAt = new Date();
  }
}
