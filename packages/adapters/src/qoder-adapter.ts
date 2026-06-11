import { BaseCliAdapter } from './base-adapter';

export class QoderAdapter extends BaseCliAdapter {
  protected getCommand(): string { return 'qodercli'; }
  protected getArgs(task: string): string[] { return ['-p', task]; }
}
