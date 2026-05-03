import { BaseCliAdapter } from './base-adapter';
export class GeminiAdapter extends BaseCliAdapter {
    getCommand() {
        return 'gemini';
    }
    formatPrompt(task) {
        return task;
    }
}
//# sourceMappingURL=gemini-adapter.js.map