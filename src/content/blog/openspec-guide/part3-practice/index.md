---
title: "OpenSpec 完整指南（三）：实战技巧与最佳实践"
description: "探讨 OpenSpec 在团队协作中的实战应用，与 spec-kit、Kiro 等工具的对比，以及提升效率的进阶技巧。"
date: 2025-12-03T19:00+08:00
tags: ["OpenSpec", "AI 编程", "SDD", "开发工具"]
---

前两篇我们介绍了 OpenSpec 的核心概念和完整工作流。这一篇，我们来聊聊实战中的技巧、团队协作模式，以及 OpenSpec 与其他工具的对比。

---

## 实战场景

### 场景一：跨多个模块的功能变更

假设你要实现「用户可以导出自己的数据」功能，这涉及：

- 用户模块：新增导出权限检查
- 数据模块：新增数据聚合逻辑
- API 模块：新增导出接口
- 通知模块：导出完成后发送邮件

传统做法是在聊天中描述需求，AI 可能会遗漏某些模块。用 OpenSpec：

```
/openspec:proposal 用户数据导出功能，需要涉及用户权限、数据聚合、API 接口和邮件通知
```

AI 会创建一个变更，包含多个规格增量：

```
openspec/changes/user-data-export/
├── proposal.md
├── tasks.md
└── specs/
    ├── user/
    │   └── spec.md      # 权限相关增量
    ├── data/
    │   └── spec.md      # 数据聚合增量
    ├── api/
    │   └── spec.md      # 接口增量
    └── notification/
        └── spec.md      # 通知增量
```

**好处**：所有相关的规格变更都在一个地方，审查时一目了然。

### 场景二：修改现有功能的行为

你需要修改登录逻辑：从「密码错误 3 次锁定」改为「5 次锁定，且锁定时间从 30 分钟改为 15 分钟」。

```
/openspec:proposal 修改登录锁定策略：错误次数从 3 次改为 5 次，锁定时间从 30 分钟改为 15 分钟
```

AI 会生成 `MODIFIED Requirements`：

```markdown
# Delta for Auth

## MODIFIED Requirements

### Requirement: Account Lockout Policy
The system MUST lock an account after 5 consecutive failed login attempts.
The lockout duration MUST be 15 minutes.

#### Scenario: Account lockout trigger
- WHEN a user fails to login 5 times consecutively
- THEN the account is locked for 15 minutes
- AND subsequent login attempts are rejected with "Account locked" message

#### Scenario: Lockout expiration
- WHEN 15 minutes have passed since lockout
- THEN the user can attempt to login again
- AND the failure counter is reset
```

**好处**：修改的内容清晰可见，不会遗漏边界情况。

### 场景三：移除废弃功能

要移除旧的「短信验证码登录」功能：

```
/openspec:proposal 移除短信验证码登录功能，该功能已废弃
```

```markdown
# Delta for Auth

## REMOVED Requirements

### Requirement: SMS OTP Login
This feature is deprecated due to:
- High SMS costs
- Security concerns with SMS interception
- Low usage rate (< 1% of logins)

Migration path:
- Existing users will be prompted to set up password or other 2FA methods
- SMS login option will be hidden from UI immediately
- Backend support will be removed after 30-day grace period
```

**好处**：移除功能的原因和迁移计划都有记录，方便后续追溯。

---

## 团队协作模式

### 模式一：规格先行的 Code Review

传统 Code Review 只看代码。用 OpenSpec 后，可以先 Review 规格：

1. 开发者创建变更提案
2. 团队 Review `proposal.md` 和规格增量
3. 规格通过后再实现
4. Code Review 时对照规格检查实现

**好处**：在写代码前发现需求问题，避免返工。

### 模式二：混合工具团队

团队成员可能用不同的 AI 工具：

- Alice 用 Claude Code
- Bob 用 Cursor
- Carol 用 GitHub Copilot

OpenSpec 的规格文件是工具无关的 Markdown，所有人共享同一套规格。每个人用自己熟悉的工具，但产出的代码都遵循相同的规格。

```bash
# 有人换了工具？更新配置即可
openspec update
```

### 模式三：渐进式采用

不需要一次性给整个项目写规格。推荐的采用路径：

1. **新功能先行**：新功能用 OpenSpec 管理
2. **逐步补充**：修改旧功能时，顺便补充规格
3. **关键模块优先**：核心业务逻辑优先写规格

```
openspec/specs/
├── auth/           # 核心模块，完整规格
│   └── spec.md
├── payment/        # 核心模块，完整规格
│   └── spec.md
└── settings/       # 非核心，暂无规格
```

---

## 与其他工具的对比

### vs. spec-kit

[spec-kit](https://github.com/spec-kit/spec-kit) 是另一个规格驱动开发工具。

| 特性 | OpenSpec | spec-kit |
|------|----------|----------|
| 适用场景 | 0→1 和 1→n | 主要 0→1 |
| 变更追踪 | 独立的 changes 文件夹 | 无 |
| 规格与变更分离 | ✓ | ✗ |
| 跨规格更新 | 原生支持 | 需要手动管理 |

**选择建议**：
- 新项目从零开始：两者都可以
- 需要频繁修改现有功能：OpenSpec 更合适

### vs. Kiro

[Kiro](https://kiro.dev) 是 AWS 推出的 AI IDE，也有规格功能。

| 特性 | OpenSpec | Kiro |
|------|----------|------|
| 工具依赖 | 无，支持多种 AI 工具 | 绑定 Kiro IDE |
| 变更组织 | 每个功能一个文件夹 | 分散在多个 spec 文件夹 |
| 功能追踪 | 集中管理 | 需要跨文件夹查看 |

**选择建议**：
- 已经在用 Kiro：可以继续用 Kiro 的规格功能
- 团队用多种工具：OpenSpec 更灵活

### vs. 无规格

没有规格时，AI 从模糊的提示词生成代码：

```
你：添加用户登录功能
AI：好的，我来实现...（可能遗漏 2FA、可能添加不需要的社交登录）
```

有规格时：

```
你：/openspec:proposal 添加用户登录功能
AI：创建规格...（明确列出需求和场景）
你：（审查规格，确认或修改）
AI：（按规格实现，不多不少）
```

---

## 进阶技巧

### 技巧一：善用 project.md

`openspec/project.md` 定义项目级别的约定，会影响所有变更：

```markdown
# Project Context

## Tech Stack
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with Prisma ORM
- Frontend: React + Next.js
- Testing: Jest + React Testing Library

## Conventions
- All API endpoints must return JSON
- Error responses must include error code and message
- All database operations must use transactions for writes
- Authentication uses JWT with 1-hour expiration

## Architecture
- Monorepo structure with packages/
- Shared types in packages/types
- API routes follow RESTful conventions
```

AI 在实现任务时会参考这些约定。

### 技巧二：规格模板

为常见的功能类型创建规格模板：

**API 接口模板**：

```markdown
### Requirement: <API Name>
The system SHALL provide a <METHOD> endpoint at <PATH>.

#### Scenario: Success response
- WHEN a valid request is received
- THEN return 200 with <response structure>

#### Scenario: Validation error
- WHEN request validation fails
- THEN return 400 with error details

#### Scenario: Authentication required
- WHEN request lacks valid authentication
- THEN return 401

#### Scenario: Authorization denied
- WHEN user lacks required permissions
- THEN return 403
```

### 技巧三：规格复用

如果多个变更涉及相同的模块，可以在规格中引用：

```markdown
# Delta for Payment

## ADDED Requirements

### Requirement: Refund Processing
The system MUST support refund processing.
This requirement extends [Payment Processing](../../../specs/payment/spec.md#payment-processing).

#### Scenario: Full refund
...
```

### 技巧四：与 CI/CD 集成

在 CI 中验证规格格式：

```yaml
# .github/workflows/ci.yml
- name: Validate OpenSpec
  run: |
    npm install -g @fission-ai/openspec
    openspec validate --all
```

### 技巧五：规格驱动的测试

规格中的 Scenario 可以直接映射到测试用例：

```markdown
#### Scenario: OTP verification success
- WHEN a user submits a valid OTP within the time window
- THEN login is completed
- AND a session token is issued
```

对应的测试：

```typescript
describe('OTP verification', () => {
  it('should complete login when valid OTP is submitted within time window', async () => {
    // WHEN
    const result = await verifyOTP(userId, validOTP);
    
    // THEN
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBeDefined();
  });
});
```

---

## 常见问题

### Q: 规格写得太细会不会限制 AI 的发挥？

不会。规格定义的是「要做什么」，不是「怎么做」。AI 在实现时仍有充分的自由度选择技术方案。

### Q: 小功能也需要写规格吗？

看情况。简单的 bug 修复或样式调整不需要。但如果涉及行为变更，建议写规格。

### Q: 规格和需求文档有什么区别？

规格更结构化、更精确。需求文档可能是「用户希望能导出数据」，规格是「系统 MUST 提供 /api/export 接口，返回 JSON 格式的用户数据」。

### Q: 如何处理紧急修复？

可以先修复，后补规格。但建议在归档前补充规格，保持文档完整。

---

## 总结

OpenSpec 的核心价值：

1. **共识先行**：人和 AI 在写代码前对齐意图
2. **变更可控**：每个功能变更都有独立的提案和规格
3. **工具无关**：支持主流 AI 编程工具
4. **适合演进**：不只是 0→1，更适合 1→n

如果你正在用 AI 编程助手，但经常遇到「AI 不理解我的意图」「代码改来改去」的问题，不妨试试 OpenSpec。

```bash
npm install -g @fission-ai/openspec
cd your-project
openspec init
```

开始你的规格驱动开发之旅吧。

---

## 资源链接

- [OpenSpec GitHub](https://github.com/Fission-AI/OpenSpec)
- [OpenSpec npm](https://www.npmjs.com/package/@fission-ai/openspec)
- [OpenSpec Discord](https://discord.gg/YctCnvvshC)
- [作者 Twitter](https://x.com/0xTab)

---

> 本文是 OpenSpec 完整指南系列的第三篇：
> - [第一篇：为什么 AI 编程需要规格驱动开发](/blog/openspec-guide/part1-intro)
> - [第二篇：OpenSpec 工作流详解](/blog/openspec-guide/part2-workflow)
> - **第三篇：实战与最佳实践**（本文）
