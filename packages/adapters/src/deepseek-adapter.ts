import { BaseCliAdapter, ExecutionResult } from './base-adapter';

const MOCK_MODE = process.env.MOCK_MODE === '1';

export class DeepSeekAdapter extends BaseCliAdapter {
  private controller: AbortController | null = null;

  protected getCommand(): string { return ''; }
  protected getArgs(): string[] { return []; }

  async execute(task: string): Promise<ExecutionResult> {
    this.node.status = 'busy';

    // Mock mode support
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.node.status = 'idle';
      return {
        stdout: `[${this.node.id} MOCK] DeepSeek analysis of: "${task.slice(0, 50)}..."

Proposal:
1. Analyze requirements thoroughly
2. Design modular architecture
3. Implement with test-driven development
4. Review and refine based on feedback`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      this.node.status = 'error';
      return {
        stdout: '',
        stderr: 'DEEPSEEK_API_KEY environment variable is not set. Set it in your .env or shell profile.',
        exitCode: 1,
        timedOut: false,
      };
    }

    const timeout = (this.node.config.timeout as number) ?? 120000;
    this.controller = new AbortController();
    const timeoutId = setTimeout(() => this.controller?.abort(), timeout);

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a professional AI assistant participating in a multi-agent discussion. Provide clear, concise, and well-structured analysis. Always end with a clear conclusion or recommendation.',
            },
            { role: 'user', content: task },
          ],
          max_tokens: 4096,
          stream: false,
          reasoning_effort: 'high',
          extra_body: { thinking: { type: 'enabled' } },
        }),
        signal: this.controller.signal,
      });

      clearTimeout(timeoutId);
      this.controller = null;

      if (!response.ok) {
        const errorText = await response.text();
        this.node.status = 'error';
        return {
          stdout: '',
          stderr: `DeepSeek API error (${response.status}): ${errorText}`,
          exitCode: 1,
          timedOut: false,
        };
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      this.node.status = 'idle';
      return {
        stdout: content,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.controller = null;
      this.node.status = 'error';

      if (err.name === 'AbortError') {
        return {
          stdout: '',
          stderr: 'DeepSeek API request timed out',
          exitCode: -1,
          timedOut: true,
        };
      }

      return {
        stdout: '',
        stderr: `DeepSeek API request failed: ${err.message}`,
        exitCode: -1,
        timedOut: false,
      };
    }
  }

  kill(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}
