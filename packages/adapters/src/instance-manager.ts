import { Node, NodeType } from '@ai-cli-link/core';
import { spawn, ChildProcess } from 'child_process';
import { rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is packages/adapters/src
// ../../.. goes up to project root (ai-cli-link)
const projectRoot = join(__dirname, '../../..');

const MOCK_MODE = process.env.MOCK_MODE === '1';

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

    // Mock mode: return simulated response without executing CLI
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      instance.status = 'done';
      return `[${instance.id} MOCK] Analysis of: "${prompt.slice(0, 50)}..."
      
Proposal:
1. Analyze requirements thoroughly
2. Design modular architecture
3. Implement with test-driven development
4. Review and refine based on feedback`;
    }

    return new Promise((resolve, reject) => {
      const command = this.getCommand(instance.type);
      const child = spawn(command, ['-p', prompt], {
        cwd: instance.workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      instance.childProcess = child;

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeoutMs);

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        instance.childProcess = null;

        if (timedOut) {
          instance.status = 'error';
          reject(new Error(`Instance ${instance.id} timed out after ${timeoutMs}ms`));
        } else if (code !== 0) {
          instance.status = 'error';
          reject(new Error(`Instance ${instance.id} failed: ${stderr}`));
        } else {
          instance.status = 'done';
          resolve(stdout.trim());
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        instance.childProcess = null;
        instance.status = 'error';
        reject(err);
      });
    });
  }

  private getCommand(type: NodeType): string {
    switch (type) {
      case 'claude':
        return 'claude';
      case 'gemini':
        return 'gemini';
      case 'qoder':
        return 'qodercli';
      default:
        throw new Error(`Unsupported CLI type: ${type}`);
    }
  }

  killInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    if (instance.childProcess) {
      instance.childProcess.kill();
      instance.childProcess = null;
    }

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
  }

  getInstances(): CLIInstance[] {
    return Array.from(this.instances.values());
  }
}
