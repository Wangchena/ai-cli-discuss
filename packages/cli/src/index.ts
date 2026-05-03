#!/usr/bin/env node

import { startServer, discussionOrchestrator } from '@ai-cli-link/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CONFIG_FILE = join(process.cwd(), '.ai-cli-link.json');

interface CliConfig {
  nodes: Array<{ type: string; count: number }>;
  maxRounds?: number;
  port?: number;
}

const DEFAULT_CONFIG: CliConfig = {
  nodes: [
    { type: 'claude', count: 2 }
  ],
  maxRounds: 3,
  port: 3000,
};

async function loadConfig(): Promise<CliConfig> {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('AI-CLI-Link - Multi-CLI Orchestration System');
    console.log('');
    console.log('Usage:');
    console.log('  ai-cli-link "your task description"');
    console.log('');
    console.log('Options:');
    console.log('  --help     Show this help message');
    console.log('  --mock     Use mock responses (for testing without CLI tools)');
    console.log('');
    console.log('Examples:');
    console.log('  ai-cli-link "Refactor packages/core to improve code quality"');
    console.log('  ai-cli-link --mock "Test task"');
    console.log('');
    console.log('Configuration:');
    console.log('  Create .ai-cli-link.json in your project root:');
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    process.exit(0);
  }

  const useMock = args.includes('--mock');
  const taskArgs = args.filter(a => a !== '--mock' && a !== '--');
  const task = taskArgs.join(' ');
  const config = await loadConfig();

  console.log('========================================');
  console.log('AI-CLI-Link - Multi-CLI Orchestration');
  console.log('========================================');
  console.log('');
  console.log(`Task: ${task}`);
  console.log(`Nodes: ${config.nodes.map(n => `${n.type} x${n.count}`).join(', ')}`);
  console.log(`Max rounds: ${config.maxRounds}`);
  console.log('');

  // Start web monitor
  console.log('Starting web monitor...');
  await startServer();
  console.log(`Monitor: http://localhost:${config.port}`);
  console.log('');

  if (useMock) {
    console.log('Launching discussion (mock mode)...');
    console.log('(Simulating CLI responses)');
    console.log('');

    const mockProposal = `Task: ${task}

Proposal:
1. Analyze the current code structure and identify key components
2. Identify areas for improvement (code quality, tests, documentation)
3. Implement refactoring incrementally with proper testing
4. Update documentation to reflect changes

This approach ensures code quality while maintaining functionality.`;

    console.log('========================================');
    console.log('Consensus Reached!');
    console.log('========================================');
    console.log('');
    console.log(mockProposal);
    console.log('');
    console.log('Task ID: mock-task-123');
    console.log(`Full discussion: http://localhost:${config.port}?task=mock-task-123`);
    console.log('');

    const outputFile = join(process.cwd(), 'ai-cli-link-result.json');
    writeFileSync(
      outputFile,
      JSON.stringify({ task, consensus: mockProposal, taskId: 'mock-task-123', mock: true }, null, 2)
    );
    console.log(`Result saved to: ${outputFile}`);
    discussionOrchestrator.cleanup();
  } else {
    // Start discussion with real CLI instances
    console.log('Launching discussion...');
    try {
      const result = await discussionOrchestrator.startDiscussion(task, {
        nodes: config.nodes.map(n => ({
          type: n.type as any,
          count: n.count,
          timeout: 120000,
        })),
        maxRounds: config.maxRounds,
      });

      console.log('');
      console.log('========================================');
      console.log('Consensus Reached!');
      console.log('========================================');
      console.log('');
      console.log(result.proposal);
      console.log('');
      console.log(`Task ID: ${result.taskId}`);
      console.log(`Full discussion: http://localhost:${config.port}?task=${result.taskId}`);
      console.log('');

      const outputFile = join(process.cwd(), 'ai-cli-link-result.json');
      writeFileSync(
        outputFile,
        JSON.stringify({ task, consensus: result.proposal, taskId: result.taskId }, null, 2)
      );
      console.log(`Result saved to: ${outputFile}`);

    } catch (error: any) {
      console.error('');
      console.error('Error:', error.message);
      console.error('');
      console.error('Tip: Use --mock mode to test without actual CLI tools:');
      console.error('  ai-cli-link --mock "your task"');
      process.exit(1);
    } finally {
      discussionOrchestrator.cleanup();
    }
  }
}

main().catch(console.error);
