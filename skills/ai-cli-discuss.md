---
description: Multi-AI CLI讨论工具 - 让多个AI CLI实例就任务进行多轮讨论并达成共识
---

# cli-discuss — AI多实例讨论工具

## 简介

`cli-discuss` 是一个终端工具，能同时调度多个 AI CLI 实例（Claude、Gemini、Qoder）对同一个任务进行多轮讨论，最终输出共识结论。你可以把它想象成一个"AI 专家讨论组"。

## 使用方式

### 基本用法

```bash
# 直接传入任务
cli-discuss "优化项目的构建配置，减少构建时间"

# 指定节点类型和数量
cli-discuss --nodes claude:2,gemini:1 "评估新架构方案"

# Mock 模式（无需 CLI 认证）
cli-discuss --mock "测试讨论流程"
```

### 参数参考

| 参数 | 说明 |
|------|------|
| `--mock` | 使用模拟响应，无需真实 CLI |
| `--nodes` | 节点配置，格式 `type:count,type:count` |
| `--rounds` | 讨论轮数（默认 3） |
| `--roles` | 角色分配，逗号分隔 |
| `--prompts` | 自定义 Prompt 文件路径 |
| `--json` | JSON 格式输出 |
| `--quiet` | 仅输出最终结果 |

### 查看完整帮助

```bash
cli-discuss --help
```

## AI 代理集成指南

### 何时使用

当你（AI 代理）需要从多个角度分析一个复杂问题时：

- 代码评审需要多角色视角
- 架构决策需要权衡多个方案
- 问题排查需要多维度分析
- 代码重构方案需要评审

### 调用方式

在你的思考过程中，当需要多角度分析时，执行：

```bash
cli-discuss "需要讨论的问题描述"
```

### 输出解析

输出格式是 Markdown，你可以直接解析 stdout：

**第1步：调用工具**
```bash
cli-discuss "你的复杂任务描述"
```

**第2步：读取结果**
`cli-discuss` 会在 stdout 输出共识结论（Markdown格式），包含：
- 核心方案
- 关键决策
- 后续建议

**第3步：参考完整讨论**
如果需要查看完整的多轮讨论过程：
- 结果同时保存到 `ai-cli-link-result.json`
- 运行 `pnpm start` 启动 Web UI 查看完整讨论

### 完整工作流示例

当你遇到复杂任务时，可以这样做：

```bash
# 1. 发起多角色讨论
RESULT=$(cli-discuss --nodes claude:1,gemini:1,qoder:1 --roles "架构师,安全专家,测试工程师" --rounds 2 "如何重构这个模块？")

# 2. 读取共识结论
echo "$RESULT"

# 3. 基于共识执行具体实现
# ... 你的实现代码 ...
```

## 快速安装

```bash
# 在项目中使用
pnpm add @ai-cli-link/cli

# 或全局安装（开发中）
npm install -g @ai-cli-link/cli

# 验证安装
cli-discuss --help
```

## 依赖的 CLI 工具

运行真实讨论需要安装并认证以下 CLI 工具（至少一个）：

- **Claude Code** — `npm install -g @anthropic-ai/claude-code`
- **Gemini CLI** — 按照 Google AI 文档配置
- **Qoder CLI** — 按照 Qoder 文档配置

## 配置文件

项目根目录可创建 `.ai-cli-link.json`：

```json
{
  "nodes": [
    { "type": "claude", "count": 2 }
  ],
  "maxRounds": 3
}
```

## 示例

### 代码评审

```bash
cli-discuss --nodes claude:1,gemini:1 --roles "前端专家,后端专家" "评审这个 API 设计的合理性"
```

输出会包含两方的独立分析、互评后的修正、以及最终共识。

### 架构决策

```bash
cli-discuss --nodes claude:2 --rounds 3 "我们该用微服务还是单体架构？"
```

### 问题排查

```bash
cli-discuss --nodes claude:1,gemini:1,qoder:1 "生产环境出现内存泄漏，分析可能的原因和排查方案"
```
