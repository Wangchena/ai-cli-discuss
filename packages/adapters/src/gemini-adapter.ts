import { BaseCliAdapter } from './base-adapter';

export class GeminiAdapter extends BaseCliAdapter {
  protected getCommand(): string { return 'gemini'; }
  protected getArgs(task: string): string[] { return ['-p', task]; }
}
