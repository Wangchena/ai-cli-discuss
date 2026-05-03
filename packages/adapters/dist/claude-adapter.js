import { BaseCliAdapter } from './base-adapter';
export class ClaudeAdapter extends BaseCliAdapter {
    getCommand() {
        return 'claude';
    }
    formatPrompt(task) {
        return task;
    }
}
//# sourceMappingURL=claude-adapter.js.map