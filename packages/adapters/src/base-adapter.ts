import { Node, NodeStatus } from '@ai-cli-link/core';
import { spawn, ChildProcess } from 'child_process';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

const MOCK_MODE = process.env.MOCK_MODE === '1';

export abstract class BaseCliAdapter {
  protected node: Node;
  protected childProcess: ChildProcess | null = null;

  constructor(node: Node) {
    this.node = node;
  }

  getNode(): Node {
    return this.node;
  }

  async execute(task: string): Promise<ExecutionResult> {
    this.updateStatus('busy');

    // Mock mode: return simulated response
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateStatus('idle');
      return {
        stdout: `[${this.node.id} MOCK] Analysis of: "${task.slice(0, 50)}..."

Proposal:
1. Analyze requirements thoroughly
2. Design modular architecture
3. Implement with test-driven development
4. Review and refine based on feedback`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
    }

    const args = this.getArgs(task);
    const command = this.getCommand();
    const timeout = (this.node.config.timeout as number) ?? 30000;
    const cwd = (this.node.config.cwd as string) || undefined;

    return new Promise((resolve) => {
      this.childProcess = spawn(command, args, { cwd, env: { ...process.env } });
      const child = this.childProcess!;

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        this.childProcess = null;
        if (timedOut) {
          this.updateStatus('error');
          resolve({
            stdout,
            stderr: 'Execution timed out',
            exitCode: -1,
            timedOut: true,
          });
        } else {
          this.updateStatus('idle');
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 0,
            timedOut: false,
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        this.childProcess = null;
        this.updateStatus('error');
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: -1,
          timedOut: false,
        });
      });
    });
  }

  protected abstract getCommand(): string;
  protected abstract getArgs(task: string): string[];

  /** Kill the running child process if any */
  kill(): void {
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM');
      this.childProcess = null;
    }
  }

  private updateStatus(status: NodeStatus): void {
    this.node.status = status;
  }
}
