import { Node, NodeStatus } from '@ai-cli-link/core';
import { spawn } from 'child_process';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export abstract class BaseCliAdapter {
  protected node: Node;

  constructor(node: Node) {
    this.node = node;
  }

  getNode(): Node {
    return this.node;
  }

  async execute(task: string): Promise<ExecutionResult> {
    this.updateStatus('busy');

    const command = this.getCommand();
    const prompt = this.formatPrompt(task);
    const timeout = (this.node.config.timeout as number) ?? 30000;

    return new Promise((resolve) => {
      const child = spawn(command, [prompt]);

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
  protected abstract formatPrompt(task: string): string;

  private updateStatus(status: NodeStatus): void {
    this.node.status = status;
  }
}
