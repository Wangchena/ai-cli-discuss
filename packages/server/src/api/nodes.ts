import { Hono } from 'hono';
import { Node } from '@ai-cli-link/core';
import {
  QoderAdapter,
  ClaudeAdapter,
  GeminiAdapter,
} from '@ai-cli-link/adapters';

const nodes: Map<string, Node> = new Map();

export const nodesRouter = new Hono();

nodesRouter.get('/', (c) => {
  return c.json(Array.from(nodes.values()));
});

nodesRouter.post('/', async (c) => {
  const body = await c.req.json<Omit<Node, 'id' | 'status'>>();
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const node: Node = {
    ...body,
    id,
    status: 'idle',
  };

  nodes.set(id, node);
  return c.json(node, 201);
});

nodesRouter.get('/:id', (c) => {
  const node = nodes.get(c.req.param('id'));
  if (!node) return c.json({ error: 'Node not found' }, 404);
  return c.json(node);
});

nodesRouter.put('/:id', (c) => {
  const id = c.req.param('id');
  const existing = nodes.get(id);
  if (!existing) return c.json({ error: 'Node not found' }, 404);

  const body = c.req.json() as Partial<Node>;
  nodes.set(id, { ...existing, ...body });
  return c.json(nodes.get(id)!);
});

nodesRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!nodes.has(id)) return c.json({ error: 'Node not found' }, 404);
  nodes.delete(id);
  return c.json({ success: true });
});

export function getAdapterForNode(node: Node) {
  switch (node.type) {
    case 'qoder':
      return new QoderAdapter(node);
    case 'claude':
      return new ClaudeAdapter(node);
    case 'gemini':
      return new GeminiAdapter(node);
    default:
      return null;
  }
}

export { nodes };
