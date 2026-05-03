import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class BaseCliAdapter {
    node;
    constructor(node) {
        this.node = node;
    }
    getNode() {
        return this.node;
    }
    async execute(task) {
        this.updateStatus('busy');
        const command = this.getCommand();
        const prompt = this.formatPrompt(task);
        const fullCommand = `${command} "${prompt}"`;
        const timeout = this.node.config.timeout ?? 30000;
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
        }
        catch (error) {
            const err = error;
            // Detect timeout: Node.js sets err.killed = true when the timeout fires
            // and kills the child process. Also check for ETIMEDOUT/ETIMEOUT codes
            // for older Node.js versions.
            const isTimeout = err.killed === true ||
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
    updateStatus(status) {
        this.node.status = status;
    }
}
//# sourceMappingURL=base-adapter.js.map