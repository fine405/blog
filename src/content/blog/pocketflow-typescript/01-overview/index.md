---
title: "PocketFlow.js 源码解析（一）：设计哲学与核心抽象"
description: "介绍 PocketFlow.js 的设计理念，以及 Node 和 Flow 两大核心抽象的基本概念。"
tags: ["TypeScript", "LLM", "AI", "框架设计", "源码分析", "PocketFlow"]
series: "PocketFlow.js 源码解析"
seriesOrder: 1
---

在 AI 应用开发领域，各种 LLM 框架层出不穷，LangChain、LlamaIndex 等框架功能强大但也相当复杂。今天要介绍的 [PocketFlow.js](https://github.com/The-Pocket/PocketFlow-Typescript) 另辟蹊径——用不到 100 行 TypeScript 代码实现了一个功能完备的 LLM 框架。

## 设计哲学

PocketFlow 的核心理念可以用三个词概括：

- **Lightweight**：零依赖、零臃肿、零厂商锁定
- **Expressive**：支持 Agent、Workflow、RAG 等主流设计模式
- **Agentic Coding**：专为 AI 辅助编程优化，让 AI Agent 来构建 Agent

这种极简设计的好处是显而易见的：代码量小意味着更容易理解、调试和定制。

## 核心抽象

PocketFlow 的架构建立在两个核心抽象之上：**Node** 和 **Flow**。

### Node：最小执行单元

Node 是框架的最小构建块，每个 Node 遵循 `prep → exec → post` 的三阶段执行模型：

```
┌─────────────────────────────────────────┐
│                  Node                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │  prep   │→ │  exec   │→ │  post   │  │
│  │ 读取数据 │  │ 执行计算 │  │ 写入结果 │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────┘
```

这种设计体现了**关注点分离**原则：

- `prep(shared)`: 从共享存储读取和预处理数据
- `exec(prepRes)`: 执行计算逻辑（通常是 LLM 调用），不访问共享存储
- `post(shared, prepRes, execRes)`: 后处理并写回数据，返回下一步 Action


### Flow：节点编排器

Flow 负责编排多个 Node 的执行顺序，支持链式调用、分支和循环：

```typescript
// 链式连接
nodeA.next(nodeB).next(nodeC);

// 条件分支
review.on("approved", payment);
review.on("rejected", finish);
review.on("needs_revision", revise);

// 循环
revise.next(review); // 修改后重新审核
```

## 类继承体系

PocketFlow 的类继承关系如下：

```
BaseNode (基础抽象)
├── Node (带重试机制)
│   ├── BatchNode (顺序批处理)
│   └── ParallelBatchNode (并行批处理)
└── Flow (流程编排)
    └── BatchFlow (批量运行 Flow)
        └── ParallelBatchFlow (并行批量运行 Flow)
```

每一层都只添加一个核心能力，保持单一职责：

| 类 | 核心能力 |
|---|---|
| BaseNode | 三阶段生命周期 + 节点连接 |
| Node | 重试 + 降级 |
| BatchNode | 顺序处理数组 |
| ParallelBatchNode | 并行处理数组 |
| Flow | 编排多个节点 |
| BatchFlow | 用不同参数多次运行 Flow |
| ParallelBatchFlow | 并行运行多个 Flow 实例 |

## 通信机制概览

PocketFlow 提供两种节点间通信方式：

### 1. Shared Store（推荐）

共享存储是一个全局数据结构，所有节点都可以读写。适合在节点间传递主要数据。

### 2. Params（用于批处理）

Params 是节点级别的临时参数，主要用于 Batch 场景，由 Flow 统一注入。

## 系列导航

本系列将分为以下几篇深入解析 PocketFlow：

1. **设计哲学与核心抽象**（本篇）
2. [Node 深度解析：BaseNode 与重试机制](../02-node)
3. [Flow 深度解析：编排与批处理](../03-flow)
4. 设计模式实践：Agent、Workflow、RAG（待更新）
5. 实战指南：完整示例与最佳实践（待更新）

> 项目地址：[https://github.com/The-Pocket/PocketFlow-Typescript](https://github.com/The-Pocket/PocketFlow-Typescript)
