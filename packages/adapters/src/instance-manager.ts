import { Node, NodeType } from '@ai-cli-link/core';
import { ChildProcess } from 'child_process';
import { rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BaseCliAdapter, ClaudeAdapter, DeepSeekAdapter, GeminiAdapter, QoderAdapter } from './index';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is packages/adapters/src
// ../../.. goes up to project root (ai-cli-link)
const projectRoot = join(__dirname, '../../..');

export interface CLIInstance {
  id: string;
  type: NodeType;
  workDir: string;
  childProcess: ChildProcess | null;
  status: 'idle' | 'running' | 'done' | 'error';
}

export interface InstanceConfig {
  type: NodeType;
  count: number;
  timeout?: number;
}

export class InstanceManager {
  private instances: Map<string, CLIInstance> = new Map();
  private adapters: Map<string, BaseCliAdapter> = new Map();

  async spawnInstances(config: InstanceConfig[]): Promise<CLIInstance[]> {
    const allInstances: CLIInstance[] = [];

    for (const nodeConfig of config) {
      for (let i = 0; i < nodeConfig.count; i++) {
        const instance = await this.createInstance(nodeConfig.type, i + 1);
        allInstances.push(instance);
      }
    }

    return allInstances;
  }

  private async createInstance(type: NodeType, instanceNum: number): Promise<CLIInstance> {
    const id = `${type}-${instanceNum}`;
    const workDir = this.createTempDir(id);

    // Create a Node config for the adapter
    const node: Node = {
      id,
      name: `${type}-${instanceNum}`,
      type,
      config: { cwd: workDir },
      status: 'idle' as any,
      capabilities: [],
    };

    const adapter = this.createAdapter(type, node);
    this.adapters.set(id, adapter);

    const instance: CLIInstance = {
      id,
      type,
      workDir,
      childProcess: null,
      status: 'idle',
    };

    this.instances.set(id, instance);
    return instance;
  }

  private createAdapter(type: NodeType, node: Node): BaseCliAdapter {
    switch (type) {
      case 'claude': return new ClaudeAdapter(node);
      case 'gemini': return new GeminiAdapter(node);
      case 'qoder':  return new QoderAdapter(node);
      case 'deepseek': return new DeepSeekAdapter(node);
      default: throw new Error(`Unsupported CLI type: ${type}`);
    }
  }

  private createTempDir(id: string): string {
    // Use project root directory instead of temp directory
    // This ensures Claude CLI can access authentication state from ~/.claude/projects/
    return projectRoot;
  }

  async executeInstance(
    instance: CLIInstance,
    prompt: string,
    timeoutMs: number = 120000
  ): Promise<string> {
    instance.status = 'running';

    const adapter = this.adapters.get(instance.id);
    if (!adapter) throw new Error(`No adapter for instance ${instance.id}`);

    adapter.getNode().config.timeout = timeoutMs;

    const result = await adapter.execute(prompt);

    if (result.exitCode !== 0 && !result.timedOut) {
      instance.status = 'error';
      throw new Error(`Instance ${instance.id} failed: ${result.stderr}`);
    }

    instance.status = result.timedOut ? 'error' : 'done';
    return result.stdout.trim();
  }

  killInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const adapter = this.adapters.get(instanceId);
    if (adapter) adapter.kill();

    instance.childProcess = null;
    instance.status = 'idle';
    return true;
  }

  cleanup(): void {
    for (const [id, instance] of this.instances.entries()) {
      this.killInstance(id);
      // Don't delete project root directory
      if (instance.workDir !== projectRoot) {
        try {
          rmSync(instance.workDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    this.instances.clear();
    this.adapters.clear();
  }

  getInstances(): CLIInstance[] {
    return Array.from(this.instances.values());
  }

  getAdapters(): Map<string, BaseCliAdapter> {
    return this.adapters;
  }
}
