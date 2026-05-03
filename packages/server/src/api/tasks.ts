import { Hono } from 'hono';
import { TaskManager, Orchestrator, MessageBus, Message } from '@ai-cli-link/core';
import { WsHandler } from '../ws/handler';
import { getAdapterForNode, nodes } from './nodes';

export function createTasksRouter(
  taskManager: TaskManager,
  orchestrator: Orchestrator,
  wsHandler: WsHandler | null,
) {
  const router = new Hono();

  router.get('/', (c) => {
    return c.json(taskManager.getAllTasks());
  });

  router.post('/', async (c) => {
    const body = await c.req.json<{
      title: string;
      description: string;
      assignedNodes: string[];
    }>();

    const task = taskManager.createTask(body);
    return c.json(task, 201);
  });

  router.get('/:id', (c) => {
    const task = taskManager.getTask(c.req.param('id'));
    if (!task) return c.json({ error: 'Task not found' }, 404);
    return c.json(task);
  });

  router.post('/:id/start', (c) => {
    const taskId = c.req.param('id');
    const result = orchestrator.startTask(taskId);
    const task = taskManager.getTask(taskId)!;

    wsHandler?.broadcastTaskUpdate(taskId, task);

    if (result.skipDiscussion) {
      executeTask(taskId, wsHandler);
    }

    return c.json({ task, skipDiscussion: result.skipDiscussion });
  });

  router.post('/:id/message', async (c) => {
    const taskId = c.req.param('id');
    const body = await c.req.json<Omit<Message, 'taskId' | 'timestamp'>>();

    const message: Message = {
      ...body,
      taskId,
      timestamp: new Date(),
    };

    orchestrator.getBus().publish(message);
    wsHandler?.broadcastToTask(taskId, message);

    if (orchestrator.areAllProposalsIn(taskId)) {
      orchestrator.transitionTo(taskId, 'decided');
      wsHandler?.broadcastTaskUpdate(taskId, taskManager.getTask(taskId));

      orchestrator.transitionTo(taskId, 'executing');
      executeTask(taskId, wsHandler);
    }

    return c.json({ success: true });
  });

  return router;
}

async function executeTask(taskId: string, wsHandler: WsHandler | null) {
  wsHandler?.broadcastTaskUpdate(taskId, { status: 'executing' });
}
