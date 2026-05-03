import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MessageBus, TaskManager, Orchestrator } from '@ai-cli-link/core';
import { nodesRouter } from './api/nodes';
import { createTasksRouter } from './api/tasks';
import { WsHandler } from './ws/handler';

const app = new Hono();

app.use('/*', cors());

const isTest = process.env.NODE_ENV === 'test';

const bus = new MessageBus();
const taskManager = new TaskManager();
const orchestrator = new Orchestrator(bus, taskManager);
const wsHandler = isTest ? null : new WsHandler(3001);

app.route('/api/nodes', nodesRouter);
app.route(
  '/api/tasks',
  createTasksRouter(taskManager, orchestrator, wsHandler),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = 3000;

if (!isTest) {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket server on ws://localhost:3001`);
}

export { app };

export default {
  port,
  fetch: app.fetch,
};
