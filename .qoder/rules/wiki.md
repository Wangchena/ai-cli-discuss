---
trigger: always_on
---

# Wiki 使用规则

本文档定义了 AI 代理在本项目中使用 llmwiki-cli 的规范和流程。

## 核心原则

1. **代码仓库必须注册到 wiki**：每个代码仓库在使用前必须先注册
2. **AI 写代码时必须使用 wiki**：所有代码变更、文档更新都必须通过 wiki 记录
3. **持续更正和维护**：AI 在编写代码过程中必须及时更新和更正 wiki 内容

## Wiki 初始化流程

### 1. 检查是否已安装 llmwiki-cli

```bash
# 检查是否已安装
wiki --version

# 如果未安装，执行安装
npm install -g llmwiki-cli
# 或
bun install -g llmwiki-cli
```

### 2. 注册代码仓库到 wiki

如果代码仓库尚未注册到 wiki，必须先执行注册：

```bash
# 在项目根目录初始化 wiki
wiki init --name "ai-cli-link-docs" --domain "ai-cli-link"

# 这会创建：
# - .llmwiki.yaml 配置文件
# - wiki/ 目录
# - wiki/index.md 索引文件
```

### 3. 验证 wiki 状态

```bash
# 查看 wiki 状态
wiki status

# 查看已注册的 wiki
wiki registry

# 设置当前活跃 wiki
wiki use
```

## AI 编码时必须遵守的规则

### 规则 1：写代码前查阅 wiki

在开始编写或修改代码前，AI 必须：

```bash
# 1. 搜索相关文档
wiki search "<关键词>"

# 2. 读取现有页面
wiki read <path>

# 3. 了解项目结构和约定
wiki list --tree
```

### 规则 2：代码变更必须同步到 wiki

每次代码变更后，AI 必须更新 wiki：

```bash
# 1. 读取现有页面
wiki read <path>

# 2. 准备更新内容（JSON 格式）
echo '{
  "title": "页面标题",
  "description": "页面描述",
  "tags": ["tag1", "tag2"],
  "content": "# 更新内容\n\n详细变更说明..."
}' | wiki write <path>

# 3. 验证更新
wiki read <path>
```

### 规则 3：创建新文档页面

当引入新功能、模块或重要变更时：

```bash
# 创建新的 wiki 页面
echo '{
  "title": "新功能文档",
  "description": "功能描述",
  "tags": ["feature", "module-name"],
  "content": "# 功能名称\n\n## 概述\n\n...\n\n## 使用方法\n\n...\n\n## 示例代码\n\n..."
}' | wiki write <path>
```

### 规则 4：更正现有文档

发现文档错误或过时内容时：

```bash
# 1. 读取当前内容
wiki read <path>

# 2. 更正并写回完整内容
echo '{
  "title": "更正后的标题",
  "description": "更正后的描述",
  "content": "更正后的完整内容..."
}' | wiki write <path>
```

### 规则 5：维护链接关系

确保 wiki 页面之间的链接完整性：

```bash
# 检查页面链接
wiki links <path>

# 检查反向链接
wiki backlinks <path>

# 查找孤立页面（无链接的页面）
wiki orphans

# 运行健康检查
wiki lint
```

## Wiki 命令完整参考

### Wiki 管理

```bash
wiki init [dir] --name --domain       # 创建新 wiki
wiki registry                         # 列出所有注册的 wiki
wiki use [wiki-id]                    # 设置活跃 wiki
```

### 读写操作

```bash
wiki read <path>                      # 读取 wiki 页面
wiki write <path>                     # 写入 wiki 页面（JSON from stdin）
wiki delete <path>                    # 删除页面
wiki list [dir] [--tree] [--json]    # 列出页面
wiki search <query> [--limit N]      # 搜索内容
```

### 健康和链接

```bash
wiki lint [--json]                    # 检查 wiki 健康状态
wiki links <path>                     # 显示出站链接
wiki backlinks <path>                 # 显示入站链接
wiki orphans                          # 查找孤立页面
wiki status [--json]                  # 显示 wiki 状态
```

### 代理帮助

```bash
wiki skill                            # 打印 LLM 代理技能指南
```

## 工作流程示例

### 示例 1：添加新功能

```bash
# 1. 搜索相关现有文档
wiki search "feature name"

# 2. 如果没有相关页面，创建新页面
echo '{
  "title": "新功能：多实例讨论",
  "description": "实现多 CLI 实例并行讨论功能",
  "tags": ["feature", "discussion", "multi-instance"],
  "content": "# 多实例讨论功能\n\n## 概述\n\n...\n\n## 实现细节\n\n...\n\n## 测试方法\n\n..."
}' | wiki write features/multi-instance-discussion.md

# 3. 更新索引和相关页面
wiki read overview.md
# 编辑后写回...
echo '{...}' | wiki write overview.md

# 4. 验证
wiki status
wiki lint
```

### 示例 2：修改现有代码

```bash
# 1. 读取相关文档
wiki read architecture.md
wiki read modules/server.md

# 2. 修改代码...

# 3. 更新文档以反映变更
echo '{
  "title": "架构文档",
  "description": "系统架构（已更新）",
  "content": "# 架构\n\n## 更新说明\n\n- 修改了 XX 模块\n- 新增了 YY 功能\n\n## 架构图\n\n..."
}' | wiki write architecture.md

# 4. 检查链接关系
wiki links architecture.md
wiki backlinks architecture.md
```

### 示例 3：修复 Bug

```bash
# 1. 创建 Bug 报告页面
echo '{
  "title": "Bug 修复：WebSocket 连接问题",
  "description": "修复 WebSocket 在特定情况下的断开问题",
  "tags": ["bug", "fix", "websocket"],
  "content": "# Bug 修复\n\n## 问题描述\n\n...\n\n## 修复方案\n\n...\n\n## 测试验证\n\n..."
}' | wiki write bugs/websocket-fix.md

# 2. 更新相关模块文档
wiki read modules/websocket.md
# 编辑后写回...
```

## 注意事项

1. **Wiki CLI 是纯文件系统工具**：不调用任何 LLM API
2. **版本控制由用户管理**：需要手动执行 git 命令提交 wiki 变更
3. **完整写入**：`wiki write` 需要完整的 JSON 内容，不是增量更新
4. **自动索引**：写入 `wiki/` 下的页面会自动更新 `wiki/index.md`
5. **错误处理**：错误消息输出到 stderr，正常输出到 stdout
6. **退出码**：0 = 成功，1 = 错误

## 强制检查清单

AI 在每次代码变更后必须检查：

- [ ] 是否已搜索相关 wiki 页面？
- [ ] 是否已更新受影响的文档？
- [ ] 是否已创建新页面（如需要）？
- [ ] 是否已更正错误或不准确的文档？
- [ ] 是否已运行 `wiki lint` 检查健康状态？
- [ ] 是否已检查链接完整性？
- [ ] 是否已提交 wiki 变更到 git？

## 配置信息

**本地配置**：`.llmwiki.yaml`（wiki 根目录）

**全局注册表**：`~/.config/llmwiki/registry.yaml`

**环境变量**：`LLMWIKI_CONFIG_DIR`（覆盖配置目录，用于测试）
