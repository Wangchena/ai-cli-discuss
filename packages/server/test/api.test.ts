import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index';

describe('Server API', () => {
  it('should return health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: 'ok' });
  });

  it('should create and list nodes', async () => {
    const createRes = await app.request('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'qoder-1',
        type: 'qoder',
        config: { timeout: 30000 },
        capabilities: ['coding', 'planning'],
      }),
    });
    expect(createRes.status).toBe(201);
    const node = await createRes.json();
    expect(node.name).toBe('qoder-1');
    expect(node.status).toBe('idle');

    const listRes = await app.request('/api/nodes');
    expect(listRes.status).toBe(200);
    const nodes = await listRes.json();
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should create and get tasks', async () => {
    const createRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Task',
        description: 'A test',
        assignedNodes: [],
      }),
    });
    expect(createRes.status).toBe(201);
    const task = await createRes.json();
    expect(task.status).toBe('pending');

    const getRes = await app.request(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(task.id);
  });
});
