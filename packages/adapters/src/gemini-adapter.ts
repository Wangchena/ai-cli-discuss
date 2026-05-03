import { BaseCliAdapter } from './base-adapter';

export class GeminiAdapter extends BaseCliAdapter {
  protected getCommand(): string {
    return 'gemini';
  }

  protected formatPrompt(task: string): string {
    return task;
  }
}
