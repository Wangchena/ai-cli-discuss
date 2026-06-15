<div align="center">
  <h1>AI-CLI-Link 🤖</h1>
  <p><strong>多AI CLI实例编排系统</strong> — 在群聊式界面中提交任务，多个AI实例自动讨论、达成共识后执行</p>
  <br/>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"/>
    <img src="https://img.shields.io/badge/TypeScript-strict-blueviolet" alt="TypeScript Strict"/>
    <img src="https://img.shields.io/badge/pnpm-9.15.9-orange" alt="pnpm 9.15.9"/>
    <img src="https://img.shields.io/badge/turborepo-2.0+-black" alt="Turborepo"/>
  </p>
</div>

---

## 概述

**AI-CLI-Link** 是一个创新的多CLI编排系统。你只需在 Web 界面中像聊天一样描述任务，系统会自动启动多个 AI CLI 实例（Claude、Gemini、Qoder 等），让它们像团队讨论一样：

| 轮次 | 做了什么 |
|------|----------|
| **第 1 轮** | 每个实例独立出方案 |
| **第 2~3 轮** | 相互评审、质疑、迭代完善 |
| **共识总结** | 总结共识，或标记分歧点返回给你确认 |

整个过程通过 WebSocket 实时推送，就像看一场群聊。

---

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动服务（开发模式，热重载）
pnpm dev

# 3. 打开浏览器访问 http://localhost:3000
```

> 如果觉得启动服务太麻烦，也可以直接在终端中使用 CLI 模式：
> ```bash
> pnpm discuss:mock "设计一个用户注册系统"
> ```

### Mock 模式（无需 CLI 认证）

如果没有配置 CLI 工具的 API Key，可以用模拟模式测试：

```bash
pnpm start:mock
```

打开 http://localhost:3000，任务会使用模拟响应展示完整的讨论流程。

---

## 核心特性

<table>
<tr>
<td width="50%">

**🎯 群聊式任务提交**

在 Web UI 中输入任务描述，就像在聊天软件里发消息一样自然。

</td>
<td width="50%">

**🔄 多实例讨论**

自动启动多个 AI CLI 实例进行多轮讨论，互相评审、迭代方案。

</td>
</tr>
<tr>
<td>

**⚖️ 共识引擎**

基于多数投票的共识算法，可配置轮次上限，最后一轮强制决策。

</td>
<td>

**📡 实时监控**

WebSocket 实时推送每条讨论消息，左右分栏布局：左侧讨论流、右侧共识总结。

</td>
</tr>
<tr>
<td>

**🎭 Mock 模式**

无需 CLI 认证即可验证整个工作流，方便快速调试和演示。

</td>
<td>

**🎨 角色定制**

为每个实例分配不同的角色（架构师、测试工程师、安全专家），并自定义 Prompt。

</td>
</tr>
<tr>
<td>

**🔒 安全执行**

使用 `child_process.spawn()` 而非 `exec()`，避免命令注入风险。

</td>
<td>

**⚡ 并行执行**

同一轮次的实例并发运行，大幅缩短讨论总耗时。

</td>
</tr>
</table>

---

## 配置

### 基础配置

在项目根目录创建 `.ai-cli-link.json`：

```json
{
  "nodes": [
    { "type": "claude", "count": 2 }
  ],
  "maxRounds": 3
}
```

支持的节点类型：`claude`、`gemini`、`qoder`、`deepseek`

### 角色定制

可以为每个节点实例分配不同的角色和自定义 Prompt，让讨论涵盖多学科视角：

```json
{
  "nodes": [
    { "type": "claude", "count": 2 },
    { "type": "gemini", "count": 1 }
  ],
  "roles": ["架构师", "测试工程师", "安全审计员"],
  "prompts": [
    "你是一名经验丰富的系统架构师，请从架构角度分析...",
    "你是一名资深测试工程师，请从质量角度分析...",
    "你是一名安全专家，请从安全角度分析..."
  ]
}
```

在 Web UI 中也可以直接勾选角色，无需手动编辑 JSON。

---

## 架构

```
┌──────────────────────────────┐
│   Web UI（React + Tailwind）  │  http://localhost:3000
│   - 任务输入 & 角色配置       │
│   - 实时讨论监控 & 共识展示   │
└──────────┬───────────────────┘
           │ HTTP REST + WebSocket
┌──────────▼───────────────────┐
│   Hono Server（Node.js）      │  端口 3000 (HTTP)
│   - API 路由                 │  端口 3001 (WS)
│   - 讨论编排器               │
│   - ConsensusEngine 接入     │
└──┬───────┬───────┬───────────┘
   │       │       │
┌──▼──┐ ┌─▼────┐ ┌▼────┐
│C-1  │ │C-2   │ │G-1  │  CLI 实例（通过 Adapter 层执行）
└─────┘ └──────┘ └─────┘
```

### 包结构

```
packages/
├── core/              # 消息总线、共识引擎、任务管理器、类型定义
├── adapters/          # CLI 适配器（BaseCliAdapter + InstanceManager）
├── server/            # Hono API、讨论编排器、WebSocket 处理
├── web/               # React 聊天 UI（Vite + TailwindCSS）
└── cli/               # CLI 入口（ai-cli-link + cli-discuss）
```

---

## 本项目主要改进

在本次重构中，核心架构做了以下改进：

- **接入 ConsensusEngine** — 讨论编排器不再依赖关键词匹配判断共识，而是通过 core 包中的 `ConsensusEngine` 进行投票裁决，包括最终轮次强制决策
- **消除 Adapter 层重复** — `BaseCliAdapter` 抽象层统一了 CLI 执行逻辑（超时、状态管理、Mock 模式），`InstanceManager` 委托执行、不再维护两套 spawn 代码
- **并行轮次** — 同一轮内的实例并发执行（`Promise.all`），不再等一个执行完再跑下一个
- **CI 配置** — 新增 `.github/workflows/ci.yml`，push/PR 自动跑 typecheck + test
- **ESLint + Prettier** — 项目级代码规范配置

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 仓库管理 | Turborepo + pnpm workspaces |
| 语言 | TypeScript（严格模式） |
| 服务端 | Hono (Node.js) + WebSocket |
| 前端 | React + Vite + TailwindCSS |
| 测试 | Vitest |
| CLI 执行 | `child_process.spawn`（安全） |

## 开发

```bash
pnpm dev        # 开发模式（热重载）
pnpm test       # 运行测试
pnpm build      # 生产构建
pnpm start      # 启动生产服务
pnpm start:mock # Mock 模式启动
```

## CLI 认证

使用真实 CLI 工具前需要先配置认证：

- **Claude CLI**: 在 `~/.claude/settings.json` 中配置 API key
- **Gemini CLI**: 配置 Google 认证
- **Qoder CLI**: 按 Qoder 官方文档配置
- **DeepSeek CLI**: 按 DeepSeek 官方文档配置

## 许可证

MIT
