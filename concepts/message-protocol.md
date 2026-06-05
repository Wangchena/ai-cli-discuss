---
title: 消息协议：群聊模式消息类型
created: '2026-05-10'
updated: '2026-05-10'
description: 定义 AI-CLI-Link 中各组件间的消息格式和类型，支持群聊讨论模式
tags:
  - protocol
  - message
  - websocket
  - group-chat
---

# 消息协议：群聊模式消息类型

## 消息格式

所有消息通过 MessageBus 和 WebSocket 传输，统一使用以下格式：

```typescript
interface Message {
  id: string;                    // 唯一标识
  taskId: string;                // 所属任务 ID
  fromNode: string;              // 发送方（qoder-1, qoder-2, user, orchestrator）
  type: MessageType;             // 消息类型
  content: string;               // 消息内容
  round?: number;                // 讨论轮次（1, 2, 3）
  replyTo?: string;              // 回复的消息 ID
  timestamp: Date;               // 时间戳
  metadata?: Record<string, unknown>; // 附加元数据
}
```

## 消息类型

| 类型 | 说明 | 发送方 |
|------|------|--------|
| proposal | 第一轮提案 | CLI 实例 |
| revision | 后续轮次修改意见 | CLI 实例 |
| comment | 用户或系统评论 | 用户/系统 |
| consensus | 共识/分歧总结 | 第一个回答方 |
| vote | 投票（预留） | CLI 实例 |
| decision | 最终决策（预留） | Orchestrator |
| result | 执行结果（预留） | CLI 实例 |

## WebSocket 消息类型

### 客户端 → 服务端

```json
{"type": "subscribe", "taskId": "task-xxx"}
```

订阅特定任务的更新。

### 服务端 → 客户端

**新消息**：
```json
{
  "type": "message",
  "taskId": "task-xxx",
  "data": { /* Message 对象 */ }
}
```

**任务状态更新**：
```json
{
  "type": "task-update",
  "taskId": "task-xxx",
  "data": {
    "status": "discussing|completed|failed",
    "round": 1,
    "maxRounds": 3,
    "assignedNodes": ["管理者", "架构师"],
    "consensus": "...",
    "hasConsensus": true
  }
}
```

## 共识总结消息

当讨论结束时，会产生一条 type=consensus 的消息：

```json
{
  "type": "consensus",
  "fromNode": "qoder-1",
  "metadata": {
    "consensus": "reached|diverged",
    "responderRole": "管理者"
  },
  "content": "总结内容..."
}
```

前端根据 metadata.consensus 的值显示不同样式：
- reached: 绿色，表示达成共识
- diverged: 橙色，表示存在分歧，需用户确认
