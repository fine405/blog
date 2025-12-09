---
title: "[译] Claude Diary：让 Claude Code 从经验中学习并更新记忆"
description: "通过日记和反思机制，将 Claude Code 的会话经验转化为持久的记忆规则，实现 AI 智能体的持续学习能力。"
tags: ["AI", "Claude", "智能体", "效率工具"]
---

> 本文翻译自 [Lance Martin](https://x.com/RLanceMartin) 的博客文章 [Claude Diary](https://rlancemartin.github.io/2025/12/01/claude_diary/)，介绍了一种让 Claude Code 从经验中学习的方法。

---

人类通过经验来提升技能、形成偏好。但很多 AI 智能体缺乏这种[持续学习](https://www.dwarkesh.com/p/timelines-june-2025)的能力。我创建了一个叫 [Claude Diary](https://github.com/rlancemartin/claude-diary) 的[插件](https://code.claude.com/docs/en/plugins)，让 Claude Code 能够从经验中学习并更新自己的记忆。代码开源在 [GitHub](https://github.com/rlancemartin/claude-diary)。

## 智能体记忆

Sumers 等人（2023）的 [CoALA 论文](https://arxiv.org/pdf/2309.02427)提出了一个智能体记忆框架，包括「程序性记忆」（如提示词指令）和「情景记忆」（如过去的行为）。

Claude Code 将系统指令存储在 `CLAUDE.md` 文件中，会话日志保存在 `~/.claude/projects/`。但问题是：如何将日志中的过去行为转化为持久的通用规则，并添加到指令中？

Park 等人（2023）的 [Generative Agents 论文](https://arxiv.org/pdf/2304.03442)展示了一种方法。他们的智能体使用反思步骤，将过去的行为综合成通用规则，用于指导未来的规划和决策。

最近，[Zhang 等人（2025）](https://arxiv.org/pdf/2510.04618)使用了类似的「生长与精炼」方法来更新智能体指令：生成器产生推理轨迹，反思器从成功和失败中提取经验，整合器将洞察整合为结构化更新。

在[最近的一次访谈](https://www.youtube.com/watch?v=IDSAMqip6ms&t=352s)中，Cat Wu（Claude Code 产品负责人）提到一些 Anthropic 员工使用类似的模式：从 Claude Code 会话中创建日记条目，然后通过反思来识别模式。

---

## 实现 Claude Diary

我在 Claude Code 中使用了这种基于反思的方法：让 Claude 从会话中提炼日记条目，然后对收集的条目进行反思，更新 `CLAUDE.md`。

### 用什么来创建日记条目？

最初我让 Claude Code 解析 JSONL 会话日志，但这需要几十次 bash 工具调用。后来我决定直接使用当前 Claude Code 会话中已加载的上下文来生成日记条目。

### 日记条目要记录什么？

我创建了一个 `/diary` [斜杠命令](https://code.claude.com/docs/en/slash-commands)，提示 Claude Code 捕获关键会话细节：完成了什么、设计决策、遇到的挑战、用户偏好、PR 反馈等。日记条目保存到：

```
~/.claude/memory/diary/YYYY-MM-DD-session-N.md
```

### 什么时候创建日记条目？

我使用混合方式：手动调用 `/diary` 和/或通过 [PreCompact hook](https://code.claude.com/docs/en/hooks-guide#hook-events-overview) 自动调用。这样我可以选择何时创建日记，同时对于使用压缩的较长会话会自动生成条目。

### 反思要捕获什么？

`/reflect` 命令指示 Claude Code 分析日记条目并生成 CLAUDE.md 更新。它会读取 CLAUDE.md 文件，检查日记条目中的规则违反情况，强化弱规则，并跨日记条目识别重复出现的模式。

由于 `CLAUDE.md` 会加载到每个会话中，反思提出的更新被格式化为单行要点。反思过程会保存分析结果并自动用综合规则更新 CLAUDE.md。反思保存到：

```
~/.claude/memory/reflections/YYYY-MM-reflection-N.md
```

### 如何跟踪已处理的条目？

一个 `processed.log` 文件防止重复分析日记条目。反思命令会先检查这个日志。日志保存到：

```
~/.claude/memory/reflections/processed.log
```

### 什么时候进行反思？

我保持反思为手动操作，因为它会直接更新 CLAUDE.md。我希望在写入 CLAUDE.md 之前先审查提议的更新。

### 更新哪些记忆文件？

我只让 Claude Code 更新用户级文件 `~/.claude/CLAUDE.md`，因为日记中捕获的很多模式（提交风格、测试、代码质量）是通用的。

---

## 实际案例

我使用 Claude Diary 已经一个月了。在想要记录的会话中运行 `diary` 命令，然后定期运行 `reflect` 来更新 CLAUDE.md。以下是一些有帮助的场景：

**PR 审查反馈**：PR 评论（可以通过 Claude Code 的 `pr-comments` 命令加载）是更新 Claude Code 记忆的绝佳反馈来源。

**Git 工作流**：系统擅长捕获 Git 工作流中的偏好——从原子提交、分支命名约定到提交信息格式。

**测试实践**：反思识别出了一些模式，比如先运行针对性测试获得快速反馈，再运行完整测试套件，以及使用专门的测试库。

**代码质量**：系统学会了避免反模式，如文件和包目录之间的命名冲突、重构后留下过时目录、不必要的冗长代码。

**智能体设计**：对于 AI 智能体工作，反思捕获了关于 token 效率的偏好，倾向于单智能体委托而非过早并行化，以及使用文件系统进行上下文卸载。

**自我纠正**：有时 CLAUDE.md 中的规则需要强化；系统很擅长发现 Claude 没有遵循指令的情况并加以强化。

---

## 总结

Claude Diary 只是一个简单的尝试，将原始的 Claude 会话转化为 `CLAUDE.md` 中的记忆更新。命令本身就是提示词，很容易修改。我也限制了自动化程度，但使用 hooks 可以轻松进一步自动化任何命令。如 [GitHub](https://github.com/rlancemartin/claude-diary?tab=readme-ov-file#future-work) 所述，还有很大的改进空间。代码作为 Claude Code 插件开源在 [这里](https://github.com/rlancemartin/claude-diary)。
