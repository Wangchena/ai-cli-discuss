import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseCliAdapter } from '../src/base-adapter';
import { Node } from '@ai-cli-link/core';

// Concrete test subclass
class TestAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'echo';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}

describe('BaseCliAdapter', () => {
  let adapter: TestAdapter;

  const testNode: Node = {
    id: 'test-node',
    name: 'test',
    type: 'custom',
    config: { timeout: 5000 },
    status: 'idle',
    capabilities: ['coding'],
  };

  beforeEach(() => {
    adapter = new TestAdapter(testNode);
  });

  it('should create adapter with node config', () => {
    expect(adapter.getNode()).toEqual(testNode);
  });

  it('should update node status to busy while executing', async () => {
    class SlowCheckAdapter extends BaseCliAdapter {
      protected getCommand(): string {
        return 'sleep';
      }
      protected formatPrompt(): string {
        return '1';
      }
    }

    const slowNode: Node = { ...testNode, config: { timeout: 5000 } };
    const slow = new SlowCheckAdapter(slowNode);

    const execPromise = slow.execute('test');
    // Give the adapter a moment to set status to busy
    await new Promise((r) => setTimeout(r, 50));
    expect(slow.getNode().status).toBe('busy');
    await execPromise;
  });

  it('should update node status back to idle after execution', async () => {
    await adapter.execute('hello');
    expect(adapter.getNode().status).toBe('idle');
  });

  it('should return execution result', async () => {
    const result = await adapter.execute('hello');
    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });

  it('should handle execution errors', async () => {
    class FailingAdapter extends BaseCliAdapter {
      protected getCommand(): string {
        return 'nonexistent-command-xyz';
      }
      protected formatPrompt(task: string): string {
        return task;
      }
    }

    const failing = new FailingAdapter(testNode);
    const result = await failing.execute('test');
    expect(result.exitCode).not.toBe(0);
    expect(failing.getNode().status).toBe('error');
  });

  it('should respect timeout', async () => {
    class SlowAdapter extends BaseCliAdapter {
      protected getCommand(): string {
        return 'sleep';
      }
      protected formatPrompt(): string {
        return '10';
      }
    }

    const slowNode: Node = {
      ...testNode,
      config: { timeout: 100 },
    };
    const slow = new SlowAdapter(slowNode);
    const result = await slow.execute('test');
    expect(result.timedOut).toBe(true);
    expect(slow.getNode().status).toBe('error');
  });
});
