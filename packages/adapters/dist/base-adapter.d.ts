import { Node } from '@ai-cli-link/core';
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
}
export declare abstract class BaseCliAdapter {
    protected node: Node;
    constructor(node: Node);
    getNode(): Node;
    execute(task: string): Promise<ExecutionResult>;
    protected abstract getCommand(): string;
    protected abstract formatPrompt(task: string): string;
    private updateStatus;
}
//# sourceMappingURL=base-adapter.d.ts.map