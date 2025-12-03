---
title: "OpenSpec 完整指南（一）：为什么 AI 编程需要规格驱动开发（SDD）"
description: "AI 编程助手很强大，但需求散落在聊天记录中时往往不可预测。OpenSpec 通过规格驱动开发，让人类和 AI 在写代码前先达成共识。"
date: 2025-12-03T18:00+08:00
tags: ["OpenSpec", "AI 编程", "SDD", "开发工具"]
---

AI 编程助手正在改变我们写代码的方式。Claude Code、Cursor、GitHub Copilot……这些工具让「对话式编程」成为现实。但你有没有遇到过这样的情况：

- AI 生成的代码偏离了你的预期，你不得不反复修正
- 需求散落在长长的聊天记录里，AI「忘记」了之前的约定
- 团队成员用不同的 AI 工具，产出的代码风格和实现方式各异
- 功能改了又改，最后连你自己都不确定「到底要做什么」

这些问题的根源在于：**我们缺少一个让人类和 AI 达成共识的机制**。

[OpenSpec](https://github.com/Fission-AI/OpenSpec) 就是为了解决这个问题而生的。

---

## 什么是 OpenSpec？

OpenSpec 是一个轻量级的规格驱动开发（Spec-Driven Development）工作流，专为 AI 编程助手设计。它的核心理念很简单：

> **在写代码之前，先就「要做什么」达成共识。**

OpenSpec 不需要 API Key，不依赖特定的 AI 工具，而是提供一套结构化的文件夹和文档约定，让你和 AI 助手在同一个「规格」上对齐。

```
┌────────────────────┐
│ 起草变更提案        │
└────────┬───────────┘
         │ 与 AI 分享意图
         ▼
┌────────────────────┐
│ 审查 & 对齐         │◀──── 反馈循环 ──────┐
│ (编辑规格/任务)     │                      │
└────────┬───────────┘                      │
         │ 批准计划                          │
         ▼                                  │
┌────────────────────┐                      │
│ 实现任务            │──────────────────────┘
│ (AI 写代码)         │
└────────┬───────────┘
         │ 交付变更
         ▼
┌────────────────────┐
│ 归档 & 更新规格      │
│ (合并到源文档)       │
└────────────────────┘
```

---

## 为什么需要 OpenSpec？

### 1. 锁定意图，减少返工

没有规格时，AI 从模糊的提示词生成代码，经常遗漏需求或添加不需要的功能。OpenSpec 让你在实现前明确「期望的行为」，AI 的产出变得可预测。

### 2. 变更可追溯

OpenSpec 使用两个核心文件夹：

- `openspec/specs/` — 当前的「真相源」，记录系统现有的规格
- `openspec/changes/` — 提议的变更，包含提案、任务和规格增量

每次功能变更都有独立的文件夹，记录「为什么改」「改什么」「怎么改」，方便审查和回溯。

### 3. 工具无关

OpenSpec 支持几乎所有主流 AI 编程工具：

| 原生斜杠命令支持 | AGENTS.md 兼容 |
|----------------|---------------|
| Claude Code | Amp |
| Cursor | Jules |
| GitHub Copilot | 其他 |
| Windsurf | |
| RooCode | |
| Cline | |
| ... | |

不同团队成员可以用不同的工具，但共享同一套规格。

### 4. 适合「棕地」项目

很多规格工具只适合从零开始的新项目（0→1）。OpenSpec 的设计特别考虑了**修改现有功能**的场景（1→n）：

- 规格和变更分离，diff 清晰
- 支持跨多个规格的更新
- 变更归档后自动合并回源规格

---

## 快速开始

### 前置条件

- Node.js >= 20.19.0

### 安装

```bash
npm install -g @fission-ai/openspec@latest
```

验证安装：

```bash
openspec --version
```

### 初始化项目

进入你的项目目录：

```bash
cd my-project
openspec init
```

初始化过程中，你可以选择使用的 AI 工具（Claude Code、Cursor 等），OpenSpec 会自动配置对应的斜杠命令。

初始化完成后，项目中会出现 `openspec/` 目录：

```
openspec/
├── specs/          # 当前规格（真相源）
├── changes/        # 变更提案
├── project.md      # 项目上下文
└── AGENTS.md       # AI 工具的工作流指引
```

### 填充项目上下文（可选）

初始化后，建议让 AI 帮你填充 `openspec/project.md`：

```
请阅读 openspec/project.md，帮我填写项目的技术栈、约定和架构信息
```

这个文件定义了项目级别的规范，会影响所有变更的实现。

---

## 核心概念

### 规格（Spec）

规格是对系统行为的结构化描述，存放在 `openspec/specs/` 目录下。每个规格文件使用 Markdown 格式，包含：

- **Purpose**：这个模块/功能的目的
- **Requirements**：具体的需求，使用 SHALL/MUST 等关键词
- **Scenarios**：验收场景，描述 WHEN/THEN 的行为

```markdown
# Auth Specification

## Purpose
Authentication and session management.

## Requirements
### Requirement: User Authentication
The system SHALL issue a JWT on successful login.

#### Scenario: Valid credentials
- WHEN a user submits valid credentials
- THEN a JWT is returned
```

### 变更（Change）

变更是对规格的修改提案，存放在 `openspec/changes/<change-name>/` 目录下。每个变更包含：

- `proposal.md` — 为什么要做这个变更
- `tasks.md` — 实现任务清单
- `design.md` — 技术设计（可选）
- `specs/` — 规格增量（Delta）

### 增量（Delta）

增量描述规格的变化，使用特殊的标记：

- `## ADDED Requirements` — 新增的能力
- `## MODIFIED Requirements` — 修改的行为
- `## REMOVED Requirements` — 移除的功能

```markdown
# Delta for Auth

## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- WHEN a user submits valid credentials
- THEN an OTP challenge is required
```

---

## 小结

OpenSpec 的核心价值在于：

1. **共识先行**：在写代码前，人和 AI 先对齐「要做什么」
2. **变更可控**：每个功能变更都有独立的提案、任务和规格增量
3. **工具无关**：支持主流 AI 编程工具，团队可以混用
4. **适合演进**：不只是 0→1，更适合 1→n 的功能迭代

下一篇，我们将深入 OpenSpec 的完整工作流，看看如何从「起草提案」到「归档变更」走完一个完整的开发周期。

---

> 本文是 OpenSpec 完整指南系列的第一篇：
> - **第一篇：为什么 AI 编程需要规格驱动开发**（本文）
> - [第二篇：OpenSpec 工作流详解](/blog/openspec-guide/part2-workflow)
> - [第三篇：实战与最佳实践](/blog/openspec-guide/part3-practice)
