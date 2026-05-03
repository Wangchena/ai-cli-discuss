import { Node, NodeStatus } from '@ai-cli-link/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    const fullCommand = `${command} "${prompt}"`;
    const timeout = (this.node.config.timeout as number) ?? 30000;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout,
      });

      this.updateStatus('idle');
      return {
        stdout,
        stderr,
        exitCode: 0,
        timedOut: false,
      };
    } catch (error: unknown) {
      const err = error as { code?: string; stdout?: string; stderr?: string; killed?: boolean; signal?: string };

      // Detect timeout: Node.js sets err.killed = true when the timeout fires
      // and kills the child process. Also check for ETIMEDOUT/ETIMEOUT codes
      // for older Node.js versions.
      const isTimeout =
        err.killed === true ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ETIMEOUT' ||
        err.code === 'ERR_CHILD_PROCESS_TIMEOUT';

      if (isTimeout) {
        this.updateStatus('error');
        return {
          stdout: err.stdout ?? '',
          stderr: 'Execution timed out',
          exitCode: -1,
          timedOut: true,
        };
      }

      const exitCode = err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? -1 : 1;

      this.updateStatus('error');
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? String(error),
        exitCode,
        timedOut: false,
      };
    }
  }

  protected abstract getCommand(): string;
  protected abstract formatPrompt(task: string): string;

  private updateStatus(status: NodeStatus): void {
    this.node.status = status;
  }
}
