import { Node, NodeType } from '@ai-cli-link/core';
import { spawn, ChildProcess } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
    const dir = join(tmpdir(), `ai-cli-link-${id}-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  async executeInstance(
    instance: CLIInstance,
    prompt: string,
    timeoutMs: number = 120000
  ): Promise<string> {
    instance.status = 'running';

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
          reject(new Error(`Instance ${instance.id} failed with code ${code}: ${stderr}`));
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
        return 'qoder';
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
      try {
        rmSync(instance.workDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    this.instances.clear();
  }

  getInstances(): CLIInstance[] {
    return Array.from(this.instances.values());
  }
}
