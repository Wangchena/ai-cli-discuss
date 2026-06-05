import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { MessageBus, TaskManager, Orchestrator } from '@ai-cli-link/core';
import { nodesRouter } from './api/nodes';
import { createTasksRouter } from './api/tasks';
import { WsHandler } from './ws/handler';
import { DiscussionOrchestrator } from './orchestrator';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = new Hono();

app.use('/*', cors());

const isTest = process.env.NODE_ENV === 'test';

const bus = new MessageBus();
const taskManager = new TaskManager();
const orchestrator = new Orchestrator(bus, taskManager);
const wsHandler = isTest ? null : new WsHandler(3001);
const discussionOrchestrator = new DiscussionOrchestrator(bus, wsHandler);

// API routes
app.route('/api/nodes', nodesRouter);
app.route('/api/tasks', createTasksRouter(taskManager, orchestrator, wsHandler));

// Discussion endpoint - main task submission
app.post('/api/discuss', async (c) => {
  const body = await c.req.json<{
    task: string;
    config: {
      nodes: Array<{ type: string; count: number }>;
      maxRounds?: number;
      roles?: string[];
      prompts?: string[];
    };
  }>();

  try {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (wsHandler) {
      wsHandler.broadcastTaskUpdate(taskId, {
        id: taskId,
        title: body.task.slice(0, 50),
        status: 'discussing',
        round: 0,
        maxRounds: body.config.maxRounds ?? 3,
      });
    }

    discussionOrchestrator.startDiscussion(
      body.task,
      {
        nodes: body.config.nodes.map((n) => ({
          type: n.type as any,
          count: n.count,
          timeout: 30000,
        })),
        maxRounds: body.config.maxRounds ?? 3,
        roles: body.config.roles,
        prompts: body.config.prompts,
        taskId,
      }
    ).catch((error) => {
      console.error('Discussion failed:', error);
      if (wsHandler) {
        wsHandler.broadcastTaskUpdate(taskId, {
          status: 'failed',
          error: error.message,
        });
      }
    });

    return c.json({ success: true, taskId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Continue existing discussion with user input
app.post('/api/discuss/:taskId/continue', async (c) => {
  const taskId = c.req.param('taskId');
  const body = await c.req.json<{ message: string }>();

  try {
    const result = await discussionOrchestrator.continueDiscussion(taskId, body.message);
    return c.json({ success: true, taskId, messages: result.allProposals });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get discussion history
app.get('/api/discuss/:taskId', (c) => {
  const taskId = c.req.param('taskId');
  const history = discussionOrchestrator.getDiscussionHistory(taskId);
  if (!history) {
    return c.json({ success: false, error: 'Discussion not found' }, 404);
  }
  return c.json({ success: true, ...history });
});

// List all discussions
app.get('/api/discuss', (c) => {
  const discussions = discussionOrchestrator.listDiscussions();
  return c.json({ success: true, discussions });
});

app.get('/health', (c) => c.json({ status: 'ok' }));

// Serve static files in production
const webDist = join(import.meta.dirname, '../../web/dist');
try {
  readFileSync(join(webDist, 'index.html'));
  app.use('/*', serveStatic({ root: webDist }));
  app.notFound((c) => {
    const html = readFileSync(join(webDist, 'index.html'));
    return c.html(html.toString());
  });
} catch {
  // Web dist not found, API only mode
}

const port = 3000;

if (!isTest) {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket server on ws://localhost:3001`);
  
  serve({ fetch: app.fetch, port });
}

export { app, wsHandler, discussionOrchestrator };

export async function startServer() {
  return { port };
}

export default {
  port,
  fetch: app.fetch,
};
