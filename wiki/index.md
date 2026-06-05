---
title: AI-CLI-Link Wiki
created: '2026-05-05'
updated: '2026-05-05'
description: Complete documentation for the AI-CLI-Link multi-CLI orchestration system
tags:
  - index
  - documentation
---

# AI-CLI-Link Wiki

## Overview

AI-CLI-Link is a multi-CLI orchestration system where multiple AI CLI instances (Claude, Gemini, Qoder) discuss tasks, propose solutions, and reach consensus through a structured discussion protocol.

---

## Sources

- [[wiki/sources/project-overview.md]] - Project overview, features, and quick start
- [[wiki/sources/claude-auth-fix.md]] - Claude CLI authentication fix and mock mode
- [[wiki/sources/qoder-cli-config.md]] - Qoder CLI configuration, command fix, and discussion test

## Entities

*(No entities documented yet)*

## Concepts

- [[wiki/concepts/message-protocol.md]] - Message types and discussion flow
- [[wiki/concepts/discussion-orchestrator.md]] - How the orchestrator coordinates discussions

## Synthesis

- [[wiki/synthesis/ai-cli-link-architecture.md]] - Detailed system architecture and package structure

---

## Quick Links

- [Getting Started](../README.md#quick-start)
- [Architecture Overview](../README.md#architecture)
- [Mock Mode Guide](wiki/sources/claude-auth-fix.md)

## Project Structure

```
ai-cli-link/
├── packages/
│   ├── core/              # Message bus, consensus engine, types
│   ├── adapters/          # CLI adapters + instance manager
│   ├── server/            # Hono API + orchestrator
│   ├── web/               # React chat UI
│   └── cli/               # CLI entry point
├── wiki/                  # This wiki
│   ├── sources/           # Source documentation
│   ├── concepts/          # Core concepts
│   └── synthesis/         # Cross-cutting analysis
└── docs/                  # Design documents
```

## Wiki Statistics

- Total Pages: 14
- Sources: 2
- Concepts: 2  
- Synthesis: 1
- Index: 1
- External pages: 8

---

*This index is managed by llmwiki-cli*