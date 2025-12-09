---
title: "PocketFlow.js 源码解析（二）：Node 深度解析"
description: "深入分析 BaseNode 的三阶段生命周期设计，以及 Node 类的重试机制实现。"
tags: ["TypeScript", "LLM", "AI", "框架设计", "源码分析", "PocketFlow"]
series: "PocketFlow.js 源码解析"
seriesOrder: 2
---

本篇深入解析 PocketFlow 的核心构建块——Node。我们将从 BaseNode 的基础设计讲起，再分析 Node 类如何在此基础上实现容错能力。

## BaseNode：基础节点类

```typescript
type NonIterableObject = Partial<Record<string, unknown>> & { [Symbol.iterator]?: never };
type Action = string;

class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject> {
  protected _params: P = {} as P;                        // 节点参数
  protected _successors: Map<Action, BaseNode> = new Map(); // 后继节点映射

  // === 生命周期三阶段 ===
  async prep(shared: S): Promise<unknown> { return undefined; }
  async exec(prepRes: unknown): Promise<unknown> { return undefined; }
  async post(shared: S, prepRes: unknown, execRes: unknown): Promise<Action | undefined> { return undefined; }

  // 内部执行钩子，子类可重写以注入额外逻辑(如重试)
  protected async _exec(prepRes: unknown): Promise<unknown> { 
    return await this.exec(prepRes); 
  }

  // 完整执行流程
  async _run(shared: S): Promise<Action | undefined> {
    const p = await this.prep(shared);
    const e = await this._exec(p);
    return await this.post(shared, p, e);
  }

  // 单节点运行(不走 Flow)
  async run(shared: S): Promise<Action | undefined> {
    if (this._successors.size > 0) 
      console.warn("Node won't run successors. Use Flow.");
    return await this._run(shared);
  }

  // === 节点连接 ===
  setParams(params: P): this { this._params = params; return this; }
  
  next<T extends BaseNode>(node: T): T {  // 链式 API，返回下一个节点
    this.on("default", node); 
    return node; 
  }
  
  on(action: Action, node: BaseNode): this {  // 条件分支
    if (this._successors.has(action)) 
      console.warn(`Overwriting successor for action '${action}'`);
    this._successors.set(action, node); 
    return this;
  }

  getNextNode(action: Action = "default"): BaseNode | undefined {
    const nextAction = action || 'default';
    const next = this._successors.get(nextAction);
    if (!next && this._successors.size > 0)
      console.warn(`Flow ends: '${nextAction}' not found in [${Array.from(this._successors.keys())}]`);
    return next;
  }

  // 浅克隆，保证 Flow 执行时节点无状态
  clone(): this {
    const clonedNode = Object.create(Object.getPrototypeOf(this));
    Object.assign(clonedNode, this);
    clonedNode._params = { ...this._params };
    clonedNode._successors = new Map(this._successors);
    return clonedNode;
  }
}
```


## 设计思路深度解析

### 1. 三阶段生命周期 (prep → exec → post)

| 阶段 | 职责 | 数据流向 |
|------|------|----------|
| prep | 从 shared 读取/准备数据 | shared → prepRes |
| exec | 纯计算/IO 操作 | prepRes → execRes |
| post | 写回 shared，决定下一步 | execRes → shared, 返回 action |

这种分离带来的好处：

- **关注点分离**: 读、算、写各司其职
- **可测试性**: exec 是纯函数，易于单测
- **流程控制**: post 返回 action 驱动状态机

### 2. 双层执行方法 (_exec vs exec)

```
_exec (内部) ──包装──▶ exec (用户实现)
```

`_exec` 是扩展点，子类(如 Node)重写它来注入重试、批处理等逻辑，而用户始终只需实现 `exec`。

### 3. 图结构连接

```typescript
// 线性流程
nodeA.next(nodeB).next(nodeC);

// 条件分支
nodeA.on("success", nodeB);
nodeA.on("error", nodeC);
```

`_successors` 是一个 `Map<Action, BaseNode>`，支持基于 action 的条件路由，本质上构建了一个有向图。

### 4. clone() 的必要性

Flow 执行时会 clone 节点：

```typescript
// Flow._orchestrate 中
current = current?.clone();
```

原因：
- 避免 `_params` 在并行执行时互相污染
- 保证节点可重入，同一个 Flow 定义可多次运行

### 5. 泛型设计

```typescript
class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject>
```

- `S`: shared 状态类型，贯穿整个流程
- `P`: params 参数类型，由 Flow 注入
- `NonIterableObject` 约束确保 params 是普通对象且不可迭代（`{ [Symbol.iterator]?: never }`），避免与 BatchNode 的数组输入混淆

### BaseNode 使用示例

```typescript
interface SharedState {
  input: string;
  result?: number;
}

class ParseNode extends BaseNode<SharedState> {
  async prep(shared) {
    return shared.input;  // 读取
  }
  
  async exec(text: string) {
    return parseInt(text, 10);  // 计算
  }
  
  async post(shared, text, num) {
    shared.result = num;  // 写回
    return num > 0 ? "positive" : "negative";  // 路由
  }
}
```

BaseNode 的极简设计让它成为一个灵活的构建块，所有高级功能(重试、批处理、并行)都通过继承扩展，而非修改核心逻辑。

---

## Node：带重试机制的节点

```typescript
class Node<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  maxRetries: number;
  wait: number;
  currentRetry: number = 0;

  constructor(maxRetries: number = 1, wait: number = 0) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }

  async execFallback(prepRes: unknown, error: Error): Promise<unknown> { 
    throw error; 
  }

  async _exec(prepRes: unknown): Promise<unknown> {
    for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
      try { 
        return await this.exec(prepRes); 
      } catch (e) {
        if (this.currentRetry === this.maxRetries - 1) {
          return await this.execFallback(prepRes, e as Error);
        }
        if (this.wait > 0) {
          await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
        }
      }
    }
    return undefined;
  }
}
```

Node 在 BaseNode 基础上增加了容错能力，解决实际场景中常见的问题：网络抖动、服务暂时不可用、资源竞争等临时性故障。

## Node 设计思路解析

### 1. 模板方法模式

通过重写 `_exec()` 而非 `exec()`，在不改变用户接口的前提下注入重试逻辑：

```
用户只需实现 exec() → Node 自动包装重试 → 对外行为透明
```

### 2. 三层容错策略

| 层级 | 机制 | 适用场景 |
|------|------|----------|
| 第一层 | 自动重试 | 临时性故障(网络超时、限流) |
| 第二层 | 等待间隔 | 给服务恢复时间 |
| 第三层 | execFallback | 返回缓存/默认值/记录日志 |

### 3. 状态可观测

`currentRetry` 暴露给子类，可在 `exec()` 中实现渐进策略：

```typescript
async exec(data) {
  const timeout = 1000 * (this.currentRetry + 1); // 递增超时
  return await fetchWithTimeout(data, timeout);
}
```

### 4. 默认值设计

- `maxRetries = 1`: 默认不重试，行为等同 BaseNode
- `wait = 0`: 默认无间隔，快速失败

### Node 典型使用模式

```typescript
// 场景：调用外部 API，3次重试，间隔2秒，失败返回缓存
class ApiNode extends Node<State> {
  constructor() { 
    super(3, 2); 
  }
  
  async exec(query) {
    return await callExternalApi(query);
  }
  
  async execFallback(query, error) {
    console.warn(`API failed after retries: ${error.message}`);
    return this._params.cachedResult ?? null;  // 降级到缓存
  }
}
```

这种设计让重试逻辑与业务逻辑解耦，用户专注于 `exec()` 的实现，容错策略通过构造参数和 `execFallback()` 灵活配置。

## 系列导航

1. [设计哲学与核心抽象](/blog/pocketflow-typescript/01-overview)
2. **Node 深度解析：BaseNode 与重试机制**（本篇）
3. [Flow 深度解析：编排与批处理](/blog/pocketflow-typescript/03-flow)
4. 设计模式实践：Agent、Workflow、RAG（待更新）
5. 实战指南：完整示例与最佳实践（待更新）

> 项目地址：[https://github.com/The-Pocket/PocketFlow-Typescript](https://github.com/The-Pocket/PocketFlow-Typescript)
