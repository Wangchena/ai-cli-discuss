import { BaseCliAdapter } from './base-adapter';

export class ClaudeAdapter extends BaseCliAdapter {
  protected getCommand(): string { return 'claude'; }
  protected getArgs(task: string): string[] { return ['-p', task]; }
}
