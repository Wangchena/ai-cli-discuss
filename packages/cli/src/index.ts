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

  if (args.length === 0) {
    console.log('AI-CLI-Link - Multi-CLI Orchestration System');
    console.log('');
    console.log('Usage:');
    console.log('  ai-cli-link "your task description"');
    console.log('');
    console.log('Options:');
    console.log('  --help     Show this help message');
    console.log('  --config   Path to config file (default: .ai-cli-link.json)');
    console.log('');
    console.log('Examples:');
    console.log('  ai-cli-link "Refactor packages/core to improve code quality"');
    console.log('  ai-cli-link "Analyze the security of our API endpoints"');
    console.log('');
    console.log('Configuration:');
    console.log('  Create .ai-cli-link.json in your project root:');
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    process.exit(0);
  }

  if (args.includes('--help')) {
    process.argv = ['node', 'ai-cli-link'];
    await main();
    return;
  }

  const task = args.join(' ');
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

  // Start discussion
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

    // Save result
    const outputFile = join(process.cwd(), 'ai-cli-link-result.json');
    writeFileSync(
      outputFile,
      JSON.stringify({ task, consensus: result.proposal, taskId: result.taskId }, null, 2)
    );
    console.log(`Result saved to: ${outputFile}`);

  } catch (error: any) {
    console.error('');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    discussionOrchestrator.cleanup();
  }
}

main().catch(console.error);
