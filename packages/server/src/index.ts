import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MessageBus, TaskManager, Orchestrator } from '@ai-cli-link/core';
import { nodesRouter } from './api/nodes';
import { createTasksRouter } from './api/tasks';
import { WsHandler } from './ws/handler';
import { DiscussionOrchestrator } from './orchestrator';

const app = new Hono();

app.use('/*', cors());

const isTest = process.env.NODE_ENV === 'test';

const bus = new MessageBus();
const taskManager = new TaskManager();
const orchestrator = new Orchestrator(bus, taskManager);
const wsHandler = isTest ? null : new WsHandler(3001);
const discussionOrchestrator = new DiscussionOrchestrator(bus, wsHandler);

app.route('/api/nodes', nodesRouter);
app.route(
  '/api/tasks',
  createTasksRouter(taskManager, orchestrator, wsHandler),
);

app.post('/api/discuss', async (c) => {
  const body = await c.req.json<{
    task: string;
    config: {
      nodes: Array<{ type: string; count: number }>;
      maxRounds?: number;
    };
  }>();

  try {
    const result = await discussionOrchestrator.startDiscussion(
      body.task,
      {
        nodes: body.config.nodes.map((n) => ({
          type: n.type as any,
          count: n.count,
          timeout: 120000,
        })),
        maxRounds: body.config.maxRounds ?? 3,
      }
    );

    return c.json({
      success: true,
      taskId: result.taskId,
      consensus: result.proposal,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = 3000;

if (!isTest) {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket server on ws://localhost:3001`);
}

export { app, wsHandler, discussionOrchestrator };

export async function startServer() {
  // Server already starts automatically on import
  return { port };
}

export default {
  port,
  fetch: app.fetch,
};
