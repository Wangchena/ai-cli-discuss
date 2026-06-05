---
title: AI-CLI-Link
created: '2026-05-05'
updated: '2026-05-05'
description: 多AI CLI实例编排系统 - 通过群聊式Web界面提交任务，多个AI CLI实例（Claude、Gemini、Qoder）进行讨论和共识决策后执行
tags:
  - overview
  - architecture
  - getting-started
---

# AI-CLI-Link 🤖

> **多AI CLI实例编排系统** — 通过群聊式Web界面提交任务，多个AI CLI实例自动进行多轮讨论，达成共识后执行。

[English](./README.md) | 中文

## 项目简介

AI-CLI-Link 是一个创新的多CLI编排系统。你只需通过一个类聊天软件的Web界面描述任务，系统会自动启动多个AI CLI实例（如 Claude、Gemini、Qoder），让它们像团队讨论一样：

1. **第1轮** - 各自独立生成方案
2. **第2轮** - 相互评审、质疑、完善
3. **第3轮** - 最终总结，达成共识

整个过程实时可见，就像观看群聊一样。

## 核心特性

| 特性 | 说明 |
|------|------|
| 🎯 **群聊式任务提交** | 在Web UI中描述任务，无需操作终端 |
| 🔄 **多实例讨论** | 自动启动2+个CLI实例，进行多轮讨论 |
| ⚖️ **共识引擎** | 多数投票 + 自动合并最佳方案 |
| 📡 **实时监控** | 通过WebSocket实时观察讨论过程 |
| 🎭 **Mock模式** | 无需CLI认证即可测试工作流 |
| 🔒 **安全执行** | 使用 `child_process.spawn` 防止命令注入 |
| 📚 **知识管理** | 集成 llmwiki 知识库系统，自动记录文档 |

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动服务（持续运行在 3000 端口）
pnpm start

# 3. 打开浏览器 http://localhost:3000
# 4. 在你的 AI CLI Link 界面中输入任务描述
```

### Mock 模式（无需 CLI 认证）

```bash
# 使用模拟响应启动服务
pnpm start:mock

# 打开 http://localhost:3000 开始测试
```

## 工作流程

```
你输入任务 → 系统启动实例 → 第1轮各自提案
                              ↓
                   第2轮互相评审 + 完善
                              ↓
                   第3轮最终总结 + 共识
                              ↓
                   实时显示结果在页面上
```

## 配置

在项目根目录创建 `.ai-cli-link.json`：

```json
{
  "nodes": [
    { "type": "claude", "count": 2 }
  ],
  "maxRounds": 3
}
```

支持的节点类型：`claude`、`gemini`、`qoder`

### 角色定制

你可以为每个节点实例分配不同的角色和自定义 Prompt：

```json
{
  "nodes": [
    { "type": "claude", "count": 2 },
    { "type": "gemini", "count": 1 }
  ],
  "maxRounds": 3,
  "roles": ["架构师", "测试工程师", "安全审计员"],
  "prompts": [
    "你是一名经验丰富的系统架构师，请从架构角度分析...",
    "你是一名测试工程师，请从质量角度分析...",
    "你是一名安全专家，请从安全角度分析..."
  ]
}
```

## 架构

```
┌─────────────────────────────┐
│   Web UI (群聊界面)          │  http://localhost:3000
│   - 任务输入                  │
│   - 实时讨论监控              │
└──────────┬──────────────────┘
           │ HTTP + WebSocket
┌──────────▼──────────────────┐
│   Hono 服务器                │  端口 3000 (HTTP)
│   - API 路由                │  端口 3001 (WS)
│   - 静态文件服务              │
│   - 讨论编排器               │
└──┬───────┬───────┬──────────┘
   │       │       │
┌──▼──┐ ┌─▼────┐ ┌▼────┐
│C-1  │ │C-2   │ │G-1  │  CLI 实例
└─────┘ └──────┘ └─────┘
```

## 项目结构

```
packages/
├── core/              # 消息总线、共识引擎、类型定义
├── adapters/          # CLI适配器 + 实例管理器
├── server/            # Hono API + 讨论编排器 + 静态服务
├── web/               # React 聊天UI（构建后整合到服务端）
└── cli/               # CLI入口（向下兼容）
wiki/                  # 知识库文档
├── index.md           # 索引
├── sources/           # 源资料（文档、外部知识）
├── entities/          # 实体（模块、组件、接口）  
├── concepts/          # 概念（设计思想、架构决策）
└── synthesis/         # 综合（里程碑、总结）
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 仓库管理 | Turborepo + pnpm workspaces |
| 语言 | TypeScript (严格模式) |
| 服务端 | Hono (Node.js) + WebSocket |
| 前端 | React + Vite + TailwindCSS |
| 测试 | Vitest |
| CLI执行 | child_process.spawn (安全) |
| 知识管理 | llmwiki-cli |

## 知识管理（Wiki）

项目使用 [llmwiki-cli](https://github.com/doum1004/llmwiki-cli) 管理知识库。所有代码变更和相关文档都会同步记录到 `wiki/` 目录。

详见 [AGENTS.md](./AGENTS.md) 了解 AI 代理使用规范。

## 开发

```bash
# 启动开发模式（热重载）
pnpm dev

# 运行测试
pnpm test

# 生产构建
pnpm build

# 启动生产服务
pnpm start
```

## CLI 认证

使用真实 CLI 工具前需要先配置认证：

- **Claude CLI**: 在 `~/.claude/settings.json` 中配置 API key
- **Gemini CLI**: 配置 Google 认证
- **Qoder CLI**: 按 Qoder 官方文档配置

## 许可证

MIT License
