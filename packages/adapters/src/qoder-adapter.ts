import { BaseCliAdapter } from './base-adapter';

export class QoderAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'qoder';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}
