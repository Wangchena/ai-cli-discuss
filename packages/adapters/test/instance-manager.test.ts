import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InstanceManager } from '../src/instance-manager';
import { tmpdir } from 'os';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

describe('InstanceManager', () => {
  let manager: InstanceManager;

  beforeEach(() => {
    manager = new InstanceManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('should spawn instances correctly', async () => {
    const instances = await manager.spawnInstances([
      { type: 'claude', count: 2 }
    ]);

    expect(instances).toHaveLength(2);
    expect(instances[0].id).toBe('claude-1');
    expect(instances[1].id).toBe('claude-2');
    expect(instances[0].status).toBe('idle');
    expect(existsSync(instances[0].workDir)).toBe(true);
  });

  it('should spawn mixed type instances', async () => {
    const instances = await manager.spawnInstances([
      { type: 'claude', count: 1 },
      { type: 'gemini', count: 1 }
    ]);

    expect(instances).toHaveLength(2);
    expect(instances[0].id).toBe('claude-1');
    expect(instances[1].id).toBe('gemini-1');
  });

  it('should create unique temp directories', async () => {
    const instances = await manager.spawnInstances([
      { type: 'claude', count: 2 }
    ]);

    expect(instances[0].workDir).not.toBe(instances[1].workDir);
  });

  it('should cleanup temp directories', async () => {
    const instances = await manager.spawnInstances([
      { type: 'claude', count: 1 }
    ]);

    const workDir = instances[0].workDir;
    manager.cleanup();

    expect(existsSync(workDir)).toBe(false);
  });

  it('should return instances list', async () => {
    await manager.spawnInstances([
      { type: 'claude', count: 2 }
    ]);

    const allInstances = manager.getInstances();
    expect(allInstances).toHaveLength(2);
  });

  it('should handle any NodeType', async () => {
    const instances = await manager.spawnInstances([
      { type: 'qoder', count: 1 }
    ]);

    expect(instances).toHaveLength(1);
    expect(instances[0].id).toBe('qoder-1');
  });
});
