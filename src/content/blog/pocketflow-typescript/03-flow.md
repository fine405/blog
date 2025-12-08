---
title: "PocketFlow.js 源码解析（三）：Flow 深度解析"
description: "深入分析 Flow 的编排机制，以及 BatchNode、ParallelBatchNode、BatchFlow 的批处理实现。"
tags: ["TypeScript", "LLM", "AI", "框架设计", "源码分析", "PocketFlow"]
series: "PocketFlow.js 源码解析"
seriesOrder: 3
---

本篇深入解析 PocketFlow 的流程编排能力——Flow 及其批处理变体。

## Flow：流程编排器

```typescript
class Flow<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  start: BaseNode;

  constructor(start: BaseNode) { 
    super(); 
    this.start = start; 
  }

  protected async _orchestrate(shared: S, params?: P): Promise<void> {
    let current: BaseNode | undefined = this.start.clone();
    const p = params || this._params;
    
    while (current) {
      current.setParams(p);
      const action = await current._run(shared);
      current = current.getNextNode(action);
      current = current?.clone();
    }
  }

  async _run(shared: S): Promise<Action | undefined> {
    const pr = await this.prep(shared);
    await this._orchestrate(shared);
    return await this.post(shared, pr, undefined);
  }

  // Flow 不应有自己的 exec 逻辑，调用会抛错
  async exec(prepRes: unknown): Promise<unknown> { throw new Error("Flow can't exec."); }
}
```

## Flow 设计思路解析

### 1. Flow 也是 Node

Flow 继承自 BaseNode，这意味着：

- Flow 可以嵌套在其他 Flow 中
- Flow 可以有自己的 `prep` 和 `post` 逻辑
- Flow 可以作为条件分支的目标

```typescript
// 嵌套 Flow 示例
const subFlow = new Flow(nodeA);
nodeA.next(nodeB);

const mainFlow = new Flow(startNode);
startNode.next(subFlow).next(endNode);
```

### 2. 编排循环

`_orchestrate` 方法是 Flow 的核心，实现了一个简单的状态机：

```typescript
while (current) {
  current.setParams(p);           // 1. 注入参数
  const action = await current._run(shared);  // 2. 执行节点
  current = current.getNextNode(action);      // 3. 根据 action 获取下一个节点
  current = current?.clone();     // 4. 克隆节点
}
```

流程终止条件：
- `post` 返回 `undefined`
- `post` 返回的 action 没有对应的后继节点

### 3. 克隆机制的重要性

每次获取下一个节点后都会 clone：

```typescript
current = current?.clone();
```

这确保了：
- 同一个 Flow 定义可以并发执行多次
- 节点的 `_params` 不会在不同执行间互相污染
- 节点状态（如 `currentRetry`）每次执行都是新的

### 4. exec 抛错设计

Flow 重写了 `exec` 方法，直接抛出错误：

```typescript
async exec(prepRes: unknown): Promise<unknown> { throw new Error("Flow can't exec."); }
```

这是一个重要的设计决策：Flow 的职责是**编排**而非**执行**。如果有人错误地在 Flow 上调用 `exec`，会立即得到明确的错误提示。

### 5. 参数传递

Flow 统一管理参数，向下传递给所有节点：

```typescript
const p = params || this._params;
// ...
current.setParams(p);
```

这使得 BatchFlow 可以用不同参数多次运行同一个 Flow。

---

## BatchNode：顺序批处理

```typescript
class BatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {
  async _exec(items: unknown[]): Promise<unknown[]> {
    if (!items || !Array.isArray(items)) return [];
    const results = [];
    for (const item of items) {
      results.push(await super._exec(item));
    }
    return results;
  }
}
```

### 设计要点

1. **继承 Node**：自动获得重试能力，每个 item 的处理都有重试保护
2. **顺序执行**：适合有依赖或需要限流的场景
3. **透明包装**：用户的 `exec` 方法处理单个 item，BatchNode 自动循环

### 使用示例

```typescript
class ProcessFiles extends BatchNode<SharedState> {
  async prep(shared) {
    return shared.files;  // 返回文件数组
  }
  
  async exec(file: string) {
    return await processFile(file);  // 处理单个文件
  }
  
  async post(shared, files, results) {
    shared.processedFiles = results;
    return undefined;
  }
}
```

---

## ParallelBatchNode：并行批处理

```typescript
class ParallelBatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {
  async _exec(items: unknown[]): Promise<unknown[]> {
    if (!items || !Array.isArray(items)) return [];
    return Promise.all(items.map((item) => super._exec(item)));
  }
}
```

### 与 BatchNode 的区别

| 特性 | BatchNode | ParallelBatchNode |
|------|-----------|-------------------|
| 执行方式 | 顺序 (for...of) | 并行 (Promise.all) |
| 适用场景 | 有依赖、需限流 | 独立任务、追求速度 |
| 错误处理 | 前面失败后面不执行 | 一个失败全部失败 |
| 资源占用 | 低 | 高（同时发起所有请求） |

### 使用示例

```typescript
class FetchUrls extends ParallelBatchNode<SharedState> {
  async prep(shared) {
    return shared.urls;
  }
  
  async exec(url: string) {
    return await fetch(url).then(r => r.json());
  }
}
```

---

## BatchFlow：多次运行 Flow

```typescript
class BatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends Flow<S, P> {
  // 默认返回空数组，子类重写以提供批量参数
  async prep(shared: S): Promise<NP> { 
    const empty: readonly NonIterableObject[] = []; 
    return empty as NP; 
  }

  async _run(shared: S): Promise<Action | undefined> {
    const batchParams = await this.prep(shared);
    for (const bp of batchParams) {
      const mergedParams = { ...this._params, ...bp };
      await this._orchestrate(shared, mergedParams);
    }
    return await this.post(shared, batchParams, undefined);
  }
}
```

### 设计要点

1. **三泛型设计**：
   - `S`: shared 状态类型
   - `P`: Flow 自身的参数类型
   - `NP`: prep 返回的批量参数数组类型（新增）
2. **prep 返回参数数组**：默认返回空数组，子类重写以提供批量参数
3. **参数合并**：`{ ...this._params, ...bp }` 允许覆盖默认参数
4. **顺序执行**：每次 Flow 执行完成后才开始下一次

### 使用示例

```typescript
// 批量处理多个文件，每个文件走完整的处理流程
class ProcessMultipleFiles extends BatchFlow<SharedState, { filename: string }> {
  async prep(shared) {
    // 返回参数数组，每个元素触发一次 Flow 执行
    return shared.filenames.map(f => ({ filename: f }));
  }
}

// 构建处理流程
const loadFile = new LoadFile();
const parseFile = new ParseFile();
const saveResult = new SaveResult();

loadFile.next(parseFile).next(saveResult);

// 创建 BatchFlow
const batchProcess = new ProcessMultipleFiles(loadFile);
await batchProcess.run({ filenames: ['a.txt', 'b.txt', 'c.txt'] });
```

---

## ParallelBatchFlow：并行多次运行 Flow

ParallelBatchFlow 继承自 BatchFlow，复用其 `prep` 方法和泛型定义，只重写 `_run` 实现并行执行：

```typescript
class ParallelBatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends BatchFlow<S, P, NP> {
  async _run(shared: S): Promise<Action | undefined> {
    const batchParams = await this.prep(shared);
    await Promise.all(batchParams.map(bp => {
      const mergedParams = { ...this._params, ...bp };
      return this._orchestrate(shared, mergedParams);
    }));
    return await this.post(shared, batchParams, undefined);
  }
}
```

### 与 BatchFlow 的区别

| 特性 | BatchFlow | ParallelBatchFlow |
|------|-----------|-------------------|
| 执行方式 | 顺序 (for...of) | 并行 (Promise.all) |
| 适用场景 | Flow 间有依赖、需要顺序保证 | 独立 Flow、追求并发效率 |
| 错误处理 | 前面失败后面不执行 | 一个失败全部失败 |
| Shared 访问 | 安全，顺序写入 | 需注意并发写入冲突 |

### 使用示例

```typescript
// 并行处理多个独立任务
class ProcessIndependentTasks extends ParallelBatchFlow<SharedState, {}, { taskId: string }[]> {
  async prep(shared) {
    return shared.tasks.map(t => ({ taskId: t.id }));
  }
  
  async post(shared, batchParams, _) {
    console.log(`Completed ${batchParams.length} tasks in parallel`);
    return undefined;
  }
}
```

### 注意事项

使用 ParallelBatchFlow 时需要注意 Shared Store 的并发安全：

```typescript
// ❌ 危险：多个 Flow 同时写入同一个字段
shared.results.push(result);

// ✅ 安全：使用唯一 key 写入
shared.results[this._params.taskId] = result;
```

---

## 通信机制详解

### Shared Store

共享存储是一个全局数据结构，所有节点都可以读写：

```typescript
interface SharedStore {
  data: string;
  summary?: string;
}

class LoadData extends Node<SharedStore> {
  async post(shared: SharedStore): Promise<string | undefined> {
    shared.data = "Some text content";
    return "default";
  }
}

class Summarize extends Node<SharedStore> {
  async prep(shared: SharedStore): Promise<string> {
    return shared.data;  // 读取上一步的数据
  }
  
  async post(shared: SharedStore, _: string, summary: string): Promise<string | undefined> {
    shared.summary = summary;  // 写入处理结果
    return undefined;
  }
}
```

### Params

Params 是节点级别的临时参数，主要用于 Batch 场景：

```typescript
class SummarizeFile extends Node<SharedStore, { filename: string }> {
  async prep(shared: SharedStore): Promise<string> {
    const filename = this._params.filename;  // 获取当前处理的文件名
    return shared.data[filename];
  }
}
```

### Shared vs Params 选择指南

| 场景 | 推荐方式 |
|------|----------|
| 节点间传递主要数据 | Shared Store |
| 批处理时区分不同执行 | Params |
| 全局配置 | Shared Store |
| 临时/局部参数 | Params |

## 系列导航

1. [设计哲学与核心抽象](./01-overview)
2. [Node 深度解析：BaseNode 与重试机制](./02-node)
3. **Flow 深度解析：编排与批处理**（本篇）
4. 设计模式实践：Agent、Workflow、RAG（待更新）
5. 实战指南：完整示例与最佳实践（待更新）

> 项目地址：[https://github.com/The-Pocket/PocketFlow-Typescript](https://github.com/The-Pocket/PocketFlow-Typescript)
