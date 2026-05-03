import { BaseCliAdapter } from './base-adapter';

export class ClaudeAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'claude';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}
