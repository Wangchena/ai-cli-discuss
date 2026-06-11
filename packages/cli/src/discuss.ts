#!/usr/bin/env node

/**
 * cli-discuss - AI-CLI-Link Headless CLI Tool
 * 
 * A CLI tool for running multi-AI discussions from the command line.
 * Designed to be called by AI coding agents (Claude Code, etc.) to
 * get multi-instance consensus on coding tasks.
 * 
 * Usage:
 *   cli-discuss "your task description"
 *   cli-discuss --mock "test task"
 *   cli-discuss --mock --nodes claude:2,gemini:1 "task"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const CONFIG_FILE = join(process.cwd(), '.ai-cli-link.json');
const RESULT_FILE = join(process.cwd(), 'ai-cli-link-result.json');

interface CliConfig {
  nodes: Array<{ type: string; count: number }>;
  maxRounds?: number;
}

const DEFAULT_CONFIG: CliConfig = {
  nodes: [{ type: 'claude', count: 2 }],
  maxRounds: 3,
};

function loadConfig(): CliConfig {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function parseNodes(nodesStr: string): Array<{ type: string; count: number }> {
  return nodesStr.split(',').map(pair => {
    const [type, countStr = '1'] = pair.trim().split(':');
    return { type, count: parseInt(countStr, 10) || 1 };
  });
}

function showHelp(exitCode = 0): void {
  console.log(`╔══════════════════════════════════════════════════════════╗
║                cli-discuss - AI 讨论 CLI 工具              ║
╚══════════════════════════════════════════════════════════════╝

📋 用途:
  启动多个 AI CLI 实例对任务进行多轮讨论，输出共识结果。
  专为 AI 编码代理（Claude Code 等）设计，可直接在终端调用。

🔧 用法:
  cli-discuss "你的任务描述"
  cli-discuss --mock "测试任务"
  cli-discuss --nodes claude:2,gemini:1 "需要多角色讨论的任务"

⚙️  选项:
  --help              显示此帮助信息
  --mock              使用模拟响应（无需 CLI 认证）
  --nodes <配置>      节点配置，格式: type:count,type:count
                      示例: claude:2,gemini:1
  --rounds <数字>     讨论轮数（默认: 3）
  --roles <角色列表>  角色分配，逗号分隔
                      示例: "架构师,测试工程师"
  --prompts <文件>    自定义 Prompt 文件路径（JSON 数组）
  --json              以 JSON 格式输出结果
  --quiet             静默模式，只输出最终结果

📝 示例:
  # 基本用法
  cli-discuss "优化 packages/core 的代码质量"

  # 多角色讨论
  cli-discus --nodes claude:2,gemini:1 --roles "架构师,安全专家,测试工程师" \\
    "评估新功能的实现方案"

  # Mock 模式测试
  cli-discuss --mock "测试工作流"

  # 指定 2 轮讨论
  cli-discuss --rounds 2 "快速评审代码变更"

  # JSON 输出（便于程序解析）
  cli-discuss --json "分析项目依赖"

🤖 AI 代理使用指南:
  作为 AI 编码代理，你可以这样使用 cli-discuss:

  1. 当你需要多角度分析一个复杂问题时：
     $ cli-discuss "你的问题描述"

  2. 输出结果会包含多轮讨论后的共识结论，
     你可以直接读取 stdout 来获取结果。

  3. 结果同时保存到 ai-cli-link-result.json，
     可以通过读取该文件获取结构化数据。

  4. 使用 --mock 模式可以快速测试工作流，
     无需等待真实 CLI 响应。

  5. 要启动 Web UI 查看完整讨论过程：
     在项目目录运行: pnpm start
     然后打开 http://localhost:3000

📄 配置文件:
  项目根目录下的 .ai-cli-link.json:
  ${JSON.stringify(DEFAULT_CONFIG, null, 2)}
`);
  process.exit(exitCode);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
  }

  const useMock = args.includes('--mock');
  const useJson = args.includes('--json');
  const quiet = args.includes('--quiet');
  const config = loadConfig();

  // Parse --nodes
  const nodesIdx = args.indexOf('--nodes');
  if (nodesIdx !== -1 && args[nodesIdx + 1]) {
    config.nodes = parseNodes(args[nodesIdx + 1]);
  }

  // Parse --rounds
  const roundsIdx = args.indexOf('--rounds');
  if (roundsIdx !== -1 && args[roundsIdx + 1]) {
    config.maxRounds = parseInt(args[roundsIdx + 1], 10) || 3;
  }

  // Parse --roles
  const rolesIdx = args.indexOf('--roles');
  let roles: string[] | undefined;
  if (rolesIdx !== -1 && args[rolesIdx + 1]) {
    roles = args[rolesIdx + 1].split(',').map(r => r.trim());
  }

  // Parse --prompts (file path)
  const promptsIdx = args.indexOf('--prompts');
  let prompts: string[] | undefined;
  if (promptsIdx !== -1 && args[promptsIdx + 1]) {
    try {
      prompts = JSON.parse(readFileSync(join(process.cwd(), args[promptsIdx + 1]), 'utf-8'));
    } catch {
      console.error(`Error: Cannot read prompts file: ${args[promptsIdx + 1]}`);
      process.exit(1);
    }
  }

  // Collect task description (all non-flag args)
  const flagKeys = ['--mock', '--json', '--quiet', '--nodes', '--rounds', '--roles', '--prompts'];
  const taskArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (flagKeys.includes(args[i])) {
      if (args[i] === '--nodes' || args[i] === '--rounds' || args[i] === '--roles' || args[i] === '--prompts') {
        i++; // skip value
      }
      continue;
    }
    taskArgs.push(args[i]);
  }
  const task = taskArgs.join(' ');

  if (!task) {
    console.error('Error: No task description provided');
    console.error('Usage: cli-discuss "your task description"');
    process.exit(1);
  }

  let result: { proposal: string; allProposals: unknown[]; taskId: string };

  if (useMock) {
    // --- Mock mode ---
    if (!quiet) console.error('🤖 Running in mock mode (simulated responses)...');
    await sleep(1500);

    result = {
      proposal: `## 共识结论

经过多轮讨论，各方就任务达成以下共识：

### 核心方案

1. **分析现有代码结构** - 识别关键组件和模块边界
2. **确定改进方向** - 代码质量、测试覆盖、文档完善
3. **增量式重构** - 保持功能完整性的前提下逐步优化
4. **完善文档** - 同步更新相关文档

### 关键决策

- 采用分层重构策略，避免大规模改动
- 优先处理核心模块，再扩展到周边
- 每个步骤都配合自动化测试验证

### 后续建议

1. 从 packages/core 开始重构
2. 添加单元测试覆盖关键路径
3. 更新 API 文档和类型定义`,
      allProposals: [],
      taskId: `mock-${Date.now()}`,
    };
  } else {
    // --- Real mode ---

    // Validate node config
    const supportedTypes = ['claude', 'gemini', 'qoder'];
    for (const node of config.nodes) {
      if (!supportedTypes.includes(node.type)) {
        console.error(`Error: Unsupported CLI type '${node.type}'. Supported: ${supportedTypes.join(', ')}`);
        process.exit(1);
      }
    }

    // Check CLI tools availability
    for (const node of config.nodes) {
      for (let i = 0; i < node.count; i++) {
        const available = await checkCommand(node.type);
        if (!available) {
          console.error(`Warning: '${node.type}' CLI not found in PATH.`);
          console.error(`  Tip: Install and authenticate ${node.type} CLI, or use --mock mode`);
          console.error(`  ${node.type} authentication: See README.md for details`);
          process.exit(1);
        }
      }
    }

    if (!quiet) console.error('🧠 Starting multi-AI discussion...');
    if (!quiet) console.error(`   Nodes: ${config.nodes.map(n => `${n.type} x${n.count}`).join(', ')}`);
    if (!quiet) console.error(`   Rounds: ${config.maxRounds}`);
    if (roles && !quiet) console.error(`   Roles: ${roles.join(', ')}`);
    if (!quiet) console.error('');

    // Dynamically import server with NODE_ENV=test to prevent auto-start
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    // Also set MOCK_MODE based on useMock
    if (useMock) process.env.MOCK_MODE = '1';

    const { discussionOrchestrator } = await import('@ai-cli-link/server');
    process.env.NODE_ENV = prevEnv;

    try {
      result = await discussionOrchestrator.startDiscussion(task, {
        nodes: config.nodes.map(n => ({
          type: n.type as any,
          count: n.count,
          timeout: 120000,
        })),
        maxRounds: config.maxRounds,
        roles,
        prompts,
      });
    } catch (error: any) {
      console.error('');
      console.error('❌ Discussion failed:', error.message);
      console.error('');
      console.error('💡 Tips:');
      console.error('   - Use --mock mode to test without actual CLI tools:');
      console.error('     cli-discuss --mock "your task"');
      console.error('   - Ensure CLI tools are authenticated:');
      console.error('     See README.md for authentication setup');
      process.exit(1);
    } finally {
      discussionOrchestrator.cleanup();
    }
  }

  // --- Output results ---

  // Save result file
  const outputData = {
    task,
    consensus: result.proposal,
    taskId: result.taskId,
    mock: useMock,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(RESULT_FILE, JSON.stringify(outputData, null, 2));

  if (useJson) {
    // JSON output
    console.log(JSON.stringify(outputData, null, 2));
  } else {
    // Markdown output (Claude Code friendly)
    console.log('');
    console.log(result.proposal);
    console.log('');
    console.log('---');
    console.log(`> 📝 任务ID: \`${result.taskId}\``);
    console.log(`> 💾 结果已保存: \`${RESULT_FILE}\``);
    console.log(`> 🌐 查看完整讨论: http://localhost:3000?task=${result.taskId}`);
    console.log('');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('which', [cmd]);
    child.on('close', (code: number) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
