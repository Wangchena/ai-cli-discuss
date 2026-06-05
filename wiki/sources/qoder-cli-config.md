---
title: "Qoder CLI 模型配置"
description: "Qoder CLI 使用 DashScope API 和 qwen3.6-plus 模型的配置说明、命令修复、WebSocket 修复和测试结果"
tags:
  - configuration
  - qoder-cli
  - model
  - dashscope
  - testing
  - bug-fix
  - websocket
created: "2026-05-10"
updated: "2026-05-10"
---

# Qoder CLI 模型配置

## 概述

本文档记录了 AI-CLI-Link 项目中 Qoder CLI 的模型配置，使用阿里云 DashScope API 和 qwen3.6-plus 模型进行代码处理。

## 配置文件

**全局配置路径**: `~/.qoder/settings.json`

## 配置内容

```json
{
  "model": {
    "baseUrl": "https://coding.dashscope.aliyuncs.com/v1",
    "apiKey": "sk-sp-95d2e4dc32014df187f480053ea71c72",
    "api": "openai-completions",
    "models": [
      {
        "id": "qwen3.6-plus",
        "name": "qwen3.6-plus"
      }
    ]
  }
}
```

## 配置说明

| 字段 | 值 | 说明 |
|------|-----|------|
| `baseUrl` | `https://coding.dashscope.aliyuncs.com/v1` | DashScope API 端点 |
| `apiKey` | `sk-sp-*` | API 认证密钥 |
| `api` | `openai-completions` | API 类型，兼容 OpenAI 格式 |
| `models[0].id` | `qwen3.6-plus` | 模型标识符 |
| `models[0].name` | `qwen3.6-plus` | 模型显示名称 |

## Bug 修复记录

### 1. Qoder CLI 命令映射修复

**问题**: InstanceManager 中使用 `qoder` 作为命令，但实际可执行文件是 `qodercli`。

**修复**: 在 `packages/adapters/src/instance-manager.ts` 中：
```typescript
case 'qoder':
  return 'qodercli';  // 修复: qoder -> qodercli
```

### 2. 前端默认节点类型修复

**问题**: 前端默认节点类型是 `claude`，但系统可能没有安装 Claude CLI。

**修复**: 在 `packages/web/src/components/TaskChat.tsx` 中：
```typescript
const [nodeType, setNodeType] = useState('qoder');  // 修复: claude -> qoder
```

### 3. 超时时间优化

**问题**: 每轮超时时间 120 秒太长，用户等待时间过长。

**修复**: 在 `packages/server/src/orchestrator.ts` 和 `packages/server/src/index.ts` 中：
```typescript
private timeoutPerRound: number = 30000;  // 修复: 120000 -> 30000
```

### 4. WebSocket 消息广播修复

**问题**: Orchestrator 中的 `executeAndCapture` 方法只调用了 `this.bus.publish(message)`，没有通过 WebSocket 发送消息给前端。

**修复**: 在 `packages/server/src/orchestrator.ts` 中：
```typescript
// Broadcast to WebSocket clients
if (this.wsHandler) {
  console.log(`[WS] Broadcasting message from ${message.fromNode} to task ${taskId}`);
  this.wsHandler.broadcastToTask(taskId, message);
}
```

并在 `packages/server/src/ws/handler.ts` 中添加了 `broadcastMessage()` 方法。

### 5. 前端 WebSocket 调试日志

**增强**: 在 `packages/web/src/components/TaskMonitor.tsx` 中添加了详细的 WebSocket 调试日志：
```typescript
console.log('[WS] Received:', parsed.type, parsed);
console.log('[WS] Adding message:', parsed.data);
console.log('[WS] Task update:', data);
```

## 多实例讨论测试

### 测试场景

- **任务**: 如何创建一个简单的 React 按钮组件？
- **配置**: 2 个 Qoder CLI 实例
- **讨论轮次**: 2 轮
- **模式**: 真实模式（非 MOCK）

### 测试结果

```bash
curl -X POST http://localhost:3000/api/discuss \
  -H "Content-Type: application/json" \
  -d '{
    "task": "如何创建一个简单的 React 按钮组件？",
    "config": {
      "nodes": [{"type": "qoder", "count": 2}],
      "maxRounds": 2
    }
  }'
```

**响应**: 讨论成功，两个 Qoder CLI 实例完成了完整的讨论流程：

1. **Round 1** - 两个实例独立生成按钮组件提案
2. **Round 2** - 实例审查对方提案并优化自己的方案
3. **共识** - 选择了更优秀的方案（包含 variant、size、className 属性）

### 共识结果摘要

最终共识包含了一个完整的 React 按钮组件，具有以下特性：
- `variant` 属性：primary、secondary、danger 三种样式
- `size` 属性：sm、md、lg 三种尺寸
- `className` 属性：自定义样式扩展
- TailwindCSS 样式
- TypeScript 类型定义
- ButtonHTMLAttributes 继承

### 测试脚本

项目包含测试脚本：
- `test-qoder-discussion.sh` - Qoder 讨论功能测试
- `test-websocket.mjs` - WebSocket 连接测试

```bash
./test-qoder-discussion.sh
node test-websocket.mjs <taskId>
```

## 安全注意事项

1. **API Key 保护**: `~/.qoder/settings.json` 包含敏感的 API 密钥
2. **文件权限**: 确保该文件仅对当前用户可读 (`chmod 600 ~/.qoder/settings.json`)
3. **Git 忽略**: 该文件已添加到 `.gitignore`，不应提交到代码仓库

## 高级功能

### 预设角色系统

前端支持选择预定义角色来指导讨论方向：
- **管理者** - 统筹全局，确保方案可落地
- **资深产品经理** - 从用户需求和业务价值角度分析
- **前端开发专家** - 关注用户体验和前端实现
- **资深后端工程师** - 关注系统架构和后端实现
- **架构师** - 关注整体架构和技术选型
- **自定义** - 自定义角色描述

### 讨论历史记录

所有讨论自动保存到 `.discussion-history/` 目录，支持：
- 查看历史讨论列表
- 重新打开已完成的讨论
- 在讨论完成后继续输入，让实例继续回应

### 顺序讨论流程

讨论采用轮流发言模式（1→2→1→2），而非并行：
- 1 号位先回答用户问题
- 2 号位看到 1 号位的回答 + 用户问题后继续回答
- 依次轮流，最终达成共识

## 相关文档

- [[ai-cli-link-architecture]] - 项目架构文档
- [[project-overview]] - 项目概览
- [[discussion-orchestrator]] - 讨论编排器文档
- [[message-protocol]] - 消息协议文档
