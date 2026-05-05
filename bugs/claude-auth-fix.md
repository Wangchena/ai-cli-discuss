---
title: 'Bug Fix: Claude CLI Authentication and Mock Mode'
created: '2026-05-05'
updated: '2026-05-05'
description: Fix Claude CLI authentication issues by using project directory and add mock mode for testing without CLI auth
tags:
  - bug
  - fix
  - authentication
  - mock-mode
  - claude
---

# Bug Fix: Claude CLI Authentication and Mock Mode

## Problem

When using the web interface to submit tasks, Claude CLI instances were failing with "Not logged in" error, even though `claude -p` worked in the terminal.

### Root Cause

Claude CLI stores authentication state per-workspace in `~/.claude/projects/<encoded-path>/`. The InstanceManager was creating temporary directories for each instance, which did not have the authentication state from the project directory.

## Solution

### 1. Use Project Directory as Work Directory

Modified `InstanceManager.createTempDir()` to return the project root directory instead of a temp directory. This ensures all CLI instances share the same authentication state.

### 2. Add Mock Mode

Added `MOCK_MODE` environment variable support for testing without CLI authentication. When enabled, instances return simulated responses instead of executing actual CLI commands.

## Files Changed

- `packages/adapters/src/instance-manager.ts` - Work directory fix + mock mode
- `packages/adapters/test/instance-manager.test.ts` - Updated tests for new behavior
- `packages/server/src/orchestrator.ts` - Added error logging for debugging
- `packages/server/package.json` - Added `start:mock` script
- `package.json` - Added `start:mock` script
- `README.md` - Updated documentation

## Usage

### Normal Mode (with CLI authentication)
```bash
pnpm start
```

### Mock Mode (for testing without CLI auth)
```bash
pnpm start:mock
```

## CLI Authentication Setup

For the system to work with real CLI tools, ensure they are authenticated. For Claude CLI with DeepSeek, configure API key in `~/.claude/settings.json`.

## Test Results

All 44 tests pass:
- @ai-cli-link/core: 23 tests passed
- @ai-cli-link/adapters: 12 tests passed
- @ai-cli-link/server: 3 tests passed

## Notes

- Mock mode returns simulated responses in ~1 second per instance
- In mock mode, the full discussion flow (3 rounds) completes in ~6 seconds
- Production deployments should use proper CLI authentication