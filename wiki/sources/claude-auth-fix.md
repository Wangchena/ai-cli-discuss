---
title: Claude CLI Authentication Fix
created: '2026-05-05'
updated: '2026-05-05'
description: Fix for Claude CLI authentication and mock mode implementation
tags:
  - bug-fix
  - authentication
  - mock-mode
  - claude
---

# Claude CLI Authentication Fix

## Problem

When using the web interface to submit tasks, Claude CLI instances failed with "Not logged in · Please run /login" error, even though `claude -p` worked in the terminal.

## Root Cause

Claude CLI stores authentication state **per-workspace** in `~/.claude/projects/<encoded-path>/`.

The original `InstanceManager` created temporary directories for each instance:
```
/var/folders/gm/xxx/ai-cli-link-claude-1-12345/
```

These temp directories did not have the authentication state from the project directory.

## Solution

### 1. Use Project Directory as Work Directory

Modified `InstanceManager.createTempDir()`:

```typescript
// Before: Created temp directory
const dir = join(tmpdir(), `ai-cli-link-${id}-${Date.now()}`);
mkdirSync(dir, { recursive: true });
return dir;

// After: Use project root
return projectRoot;
```

This ensures all CLI instances share the same authentication state.

### 2. Add Mock Mode

Added `MOCK_MODE` environment variable support:

```typescript
const MOCK_MODE = process.env.MOCK_MODE === '1';

async executeInstance(instance, prompt, timeoutMs): Promise<string> {
  if (MOCK_MODE) {
    await sleep(1000);  // Simulate processing
    return `[${instance.id} MOCK] Analysis...`;
  }
  // Normal execution...
}
```

## Configuration

### For Claude CLI with DeepSeek

Edit `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "your-api-key",
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic"
  }
}
```

## Usage

```bash
# Normal mode (with authentication)
pnpm start

# Mock mode (no authentication needed)
pnpm start:mock
```

## Test Results

All 44 tests pass:
- @ai-cli-link/core: 23 tests
- @ai-cli-link/adapters: 12 tests
- @ai-cli-link/server: 3 tests

## Files Changed

- `packages/adapters/src/instance-manager.ts` - Work directory fix + mock mode
- `packages/adapters/test/instance-manager.test.ts` - Updated tests
- `packages/server/package.json` - Added start:mock script
- `package.json` - Added start:mock script
- `README.md` - Updated documentation

## See Also

- [[project-overview]] - Project overview
- [[discussion-orchestrator]] - How orchestrator uses InstanceManager
- [[ai-cli-link-architecture]] - System architecture