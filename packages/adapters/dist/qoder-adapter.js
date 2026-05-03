import { BaseCliAdapter } from './base-adapter';
export class QoderAdapter extends BaseCliAdapter {
    getCommand() {
        return 'qoder';
    }
    formatPrompt(task) {
        return task;
    }
}
//# sourceMappingURL=qoder-adapter.js.map