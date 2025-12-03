---
title: "OpenSpec 完整指南（二）：工作流详解与命令参考"
description: "深入了解 OpenSpec 的完整工作流：从起草变更提案、审查规格、实现任务到归档变更，掌握每个环节的操作方法和命令。"
date: 2025-12-03T18:30+08:00
tags: ["OpenSpec", "AI 编程", "SDD", "开发工具"]
---

上一篇我们介绍了 OpenSpec 的核心理念和基本概念。这一篇，我们将通过一个完整的例子，走一遍 OpenSpec 的工作流程。

---

## 工作流概览

OpenSpec 的工作流分为四个阶段：

```
起草提案 → 审查对齐 → 实现任务 → 归档变更
```

每个阶段都有对应的命令和操作，让我们逐一拆解。

---

## 第一步：起草变更提案

假设我们要为一个应用添加「双因素认证」功能。

### 使用斜杠命令（推荐）

如果你使用的 AI 工具支持原生斜杠命令，可以直接输入：

```
/openspec:proposal 添加双因素认证功能
```

不同工具的命令格式略有差异：

| 工具 | 命令格式 |
|------|---------|
| Claude Code | `/openspec:proposal` |
| Cursor | `/openspec-proposal` |
| GitHub Copilot | `/openspec-proposal` |
| Windsurf | `/openspec-proposal` |

### 使用自然语言

如果工具不支持斜杠命令，直接用自然语言：

```
请创建一个 OpenSpec 变更提案，为系统添加双因素认证功能
```

### AI 会做什么？

AI 会在 `openspec/changes/` 下创建一个新的变更文件夹：

```
openspec/changes/add-2fa/
├── proposal.md       # 变更提案：为什么要做、做什么
├── tasks.md          # 任务清单
├── design.md         # 技术设计（可选）
└── specs/
    └── auth/
        └── spec.md   # 规格增量
```

### 生成的文件示例

**proposal.md** — 变更提案：

```markdown
# Add Two-Factor Authentication

## Summary
Add OTP-based two-factor authentication to enhance account security.

## Motivation
- Protect user accounts from credential theft
- Meet compliance requirements for sensitive operations
- Industry standard security practice

## Scope
- OTP generation and verification
- User enrollment flow
- Login flow modification
```

**tasks.md** — 任务清单：

```markdown
## 1. Database Setup
- [ ] 1.1 Add OTP secret column to users table
- [ ] 1.2 Create OTP verification logs table

## 2. Backend Implementation
- [ ] 2.1 Add OTP generation endpoint
- [ ] 2.2 Modify login flow to require OTP
- [ ] 2.3 Add OTP verification endpoint

## 3. Frontend Updates
- [ ] 3.1 Create OTP input component
- [ ] 3.2 Update login flow UI
```

**specs/auth/spec.md** — 规格增量：

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login when 2FA is enabled.

#### Scenario: OTP required after password
- WHEN a user with 2FA enabled submits valid credentials
- THEN an OTP challenge is presented
- AND login is not completed until OTP is verified

#### Scenario: OTP verification success
- WHEN a user submits a valid OTP within the time window
- THEN login is completed
- AND a session token is issued

#### Scenario: OTP verification failure
- WHEN a user submits an invalid OTP
- THEN login is rejected
- AND the attempt is logged
```

---

## 第二步：审查与对齐

变更创建后，使用 CLI 命令检查和审查。

### 查看活跃变更

```bash
openspec list
```

输出：

```
Active Changes:
  add-2fa    Created: 2025-12-03
```

### 验证规格格式

```bash
openspec validate add-2fa
```

这会检查规格文件的格式是否正确：
- 是否使用了正确的标题层级
- 是否包含必要的 Scenario
- 是否使用了 SHALL/MUST 等关键词

### 查看变更详情

```bash
openspec show add-2fa
```

这会显示提案、任务和规格增量的完整内容，方便审查。

### 交互式仪表板

```bash
openspec view
```

打开一个交互式界面，可以浏览所有规格和变更。

### 迭代修改

如果规格需要调整，继续和 AI 对话：

```
请在 add-2fa 的规格中添加「备用恢复码」的场景
```

AI 会更新 `openspec/changes/add-2fa/specs/auth/spec.md`：

```markdown
## ADDED Requirements

### Requirement: Backup Recovery Codes
The system MUST provide backup recovery codes when 2FA is enabled.

#### Scenario: Generate recovery codes
- WHEN a user enables 2FA
- THEN 10 single-use recovery codes are generated
- AND codes are displayed only once

#### Scenario: Use recovery code
- WHEN a user cannot access their OTP device
- THEN they can use a recovery code to login
- AND the used code is invalidated
```

**关键点**：在这个阶段反复迭代，直到规格完全符合预期。这比写完代码再改要高效得多。

---

## 第三步：实现任务

规格确认后，开始实现。

### 使用斜杠命令

```
/openspec:apply add-2fa
```

或自然语言：

```
规格看起来没问题了，请开始实现 add-2fa 变更
```

### AI 会做什么？

AI 会按照 `tasks.md` 中的任务清单逐一实现：

1. 读取任务列表
2. 参考规格中的场景和需求
3. 实现代码
4. 标记任务完成

```markdown
## 1. Database Setup
- [x] 1.1 Add OTP secret column to users table ✓
- [x] 1.2 Create OTP verification logs table ✓

## 2. Backend Implementation
- [x] 2.1 Add OTP generation endpoint ✓
- [x] 2.2 Modify login flow to require OTP ✓
- [x] 2.3 Add OTP verification endpoint ✓

## 3. Frontend Updates
- [ ] 3.1 Create OTP input component
- [ ] 3.2 Update login flow UI
```

### 中断与继续

如果实现过程中需要暂停，任务状态会保存在 `tasks.md` 中。下次继续时，AI 会从未完成的任务开始。

### 实现过程中的反馈

如果发现规格有遗漏，可以随时回到第二步修改规格，然后继续实现。这就是 OpenSpec 的「反馈循环」。

---

## 第四步：归档变更

所有任务完成后，归档变更。

### 使用斜杠命令

```
/openspec:archive add-2fa
```

或 CLI：

```bash
openspec archive add-2fa --yes
```

`--yes` 参数跳过确认提示。

### 归档做了什么？

1. 将 `openspec/changes/add-2fa/specs/` 中的增量合并到 `openspec/specs/`
2. 将变更文件夹移动到 `openspec/archive/`
3. 更新源规格文件

归档后，`openspec/specs/auth/spec.md` 会包含新增的双因素认证需求，成为新的「真相源」。

---

## 命令参考

| 命令 | 说明 |
|------|------|
| `openspec init` | 初始化项目，配置 AI 工具 |
| `openspec list` | 列出所有活跃的变更 |
| `openspec view` | 打开交互式仪表板 |
| `openspec show <change>` | 显示变更详情 |
| `openspec validate <change>` | 验证规格格式 |
| `openspec archive <change>` | 归档已完成的变更 |
| `openspec update` | 更新 AI 工具配置 |

---

## 目录结构详解

完整的 OpenSpec 目录结构：

```
openspec/
├── specs/                    # 当前规格（真相源）
│   ├── auth/
│   │   └── spec.md
│   └── user/
│       └── spec.md
├── changes/                  # 活跃的变更
│   └── add-2fa/
│       ├── proposal.md
│       ├── tasks.md
│       ├── design.md
│       └── specs/
│           └── auth/
│               └── spec.md
├── archive/                  # 已归档的变更
│   └── add-login/
│       └── ...
├── project.md                # 项目上下文
└── AGENTS.md                 # AI 工具指引
```

### 文件说明

| 文件/目录 | 说明 |
|----------|------|
| `specs/` | 当前系统的规格，是「真相源」 |
| `changes/` | 进行中的变更提案 |
| `archive/` | 已完成并归档的变更 |
| `project.md` | 项目级别的约定和上下文 |
| `AGENTS.md` | AI 工具的工作流指引 |

---

## 规格文件格式

### 源规格（specs/）

```markdown
# <Module> Specification

## Purpose
<模块的目的和职责>

## Requirements

### Requirement: <需求名称>
<使用 SHALL/MUST 描述的需求>

#### Scenario: <场景名称>
- WHEN <前置条件>
- THEN <期望结果>
- AND <附加结果>
```

### 增量规格（changes/*/specs/）

```markdown
# Delta for <Module>

## ADDED Requirements
### Requirement: <新需求>
...

## MODIFIED Requirements
### Requirement: <修改的需求>
<完整的更新后文本>

## REMOVED Requirements
### Requirement: <移除的需求>
<说明为什么移除>
```

---

## 小结

OpenSpec 的工作流可以总结为：

1. **起草**：用 `/openspec:proposal` 创建变更提案
2. **审查**：用 `openspec show/validate` 检查规格，迭代修改
3. **实现**：用 `/openspec:apply` 让 AI 按任务清单实现
4. **归档**：用 `openspec archive` 合并规格，完成变更

这个流程的核心是「规格先行」——在写代码前，先把「要做什么」写清楚。这不仅让 AI 的产出更可预测，也让团队协作更顺畅。

下一篇，我们将探讨 OpenSpec 在团队中的实战应用，以及与其他规格工具的对比。

---

> 本文是 OpenSpec 完整指南系列的第二篇：
> - [第一篇：为什么 AI 编程需要规格驱动开发](/blog/openspec-guide/part1-intro)
> - **第二篇：OpenSpec 工作流详解**（本文）
> - [第三篇：实战与最佳实践](/blog/openspec-guide/part3-practice)
