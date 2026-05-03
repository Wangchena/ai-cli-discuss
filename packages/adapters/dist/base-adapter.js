import { spawn } from 'child_process';
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
        const timeout = this.node.config.timeout ?? 30000;
        return new Promise((resolve) => {
            const child = spawn(command, [prompt]);
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr?.on('data', (data) => {
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
                }
                else {
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
    updateStatus(status) {
        this.node.status = status;
    }
}
//# sourceMappingURL=base-adapter.js.map