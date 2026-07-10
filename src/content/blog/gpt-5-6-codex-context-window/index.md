---
title: "GPT-5.6 有 105 万上下文，为什么到了 Codex 只剩 30 多万？"
description: "从官方模型文档、Codex 源码和 GitHub issue 拆开 105 万、37.2 万、35.34 万与 33.48 万，解释 Codex 为什么没有直接开放完整上下文。"
date: 2026-07-11T00:50:00+08:00
tags: ["AI", "Codex", "LLM", "源码分析"]
---

GPT-5.6 的官方模型页写着 1,050,000 token 上下文，但在 Codex 里打开上下文状态，只能看到 35 万左右。继续跑一会儿，30 多万 token 时又开始自动压缩。

这不是显示错误，也不是 GPT-5.6 做不到百万上下文。Codex 给同一个模型设置了单独的产品级上限。

我把官方文档、Codex 当前源码和几个相关 issue 对了一遍。先说结论：**截至 2026 年 7 月 11 日，GPT-5.6 在 API 中支持 105 万总上下文；Codex 当前配置的是 372,000 token 基础窗口，界面可见的有效窗口是 353,400 token，并会在约 334,800 token 时自动压缩。**

所以大家常说的「Codex 只有 300K」方向没错，但数字不够准确。

## 先把几个数字分清楚

| 数字 | 代表什么 |
| --- | --- |
| 1,050,000 | GPT-5.6 API 的总上下文窗口 |
| 922,000 | API 单次请求的最大输入 |
| 128,000 | API 单次请求的最大输出 |
| 372,000 | Codex 模型目录中的上下文基数与可配置上限 |
| 353,400 | Codex 按 95% 计算出的有效窗口，状态栏看到的接近这个数 |
| 334,800 | 默认自动压缩阈值，也就是 372,000 的 90% |

GPT-5.6 Sol、Terra 和 Luna 的官方页面给出的窗口都一样：1,050,000 总上下文，最多 922,000 输入和 128,000 输出。可以分别查看 [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)、[Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) 和 [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) 的模型说明。

这里最容易混淆的一点是：**105 万不是 105 万纯输入。** 它本身已经包含最多 12.8 万输出：

```text
922,000 输入 + 128,000 输出 = 1,050,000 总上下文
```

## Codex 的 35 万是怎么算出来的

Codex 仓库在 2026 年 7 月 9 日更新了 GPT-5.6 模型目录。Sol、Terra、Luna 三个模型写的都是：

```json
{
  "context_window": 372000,
  "max_context_window": 372000,
  "auto_compact_token_limit": null
}
```

这是 [Codex 当前模型目录](https://github.com/openai/codex/blob/d2d00b6632dc991aa4471db0529773029cae5d68/codex-rs/models-manager/models.json#L4-L27) 中的真实配置，不是根据界面反推出来的。

围绕 372K，Codex 又算出两个不同用途的数。它们都直接乘以 372K，不是先扣 5% 再扣 10%。

一个是有效窗口。Codex 默认只把基础窗口的 95% 当作可用上下文，[源码注释](https://github.com/openai/codex/blob/d2d00b6632dc991aa4471db0529773029cae5d68/codex-rs/protocol/src/openai_models.rs#L402-L405) 写得很直接：剩余空间留给系统提示词、工具开销和模型输出。计算逻辑在 [`turn_context.rs`](https://github.com/openai/codex/blob/d2d00b6632dc991aa4471db0529773029cae5d68/codex-rs/core/src/session/turn_context.rs#L191-L198)：

```text
372,000 × 95% = 353,400
```

另一个是自动压缩阈值。模型没有单独填写这个值时，Codex 会用窗口的 90%，相关逻辑在 [`openai_models.rs`](https://github.com/openai/codex/blob/d2d00b6632dc991aa4471db0529773029cae5d68/codex-rs/protocol/src/openai_models.rs#L440-L451)：

```text
372,000 × 90% = 334,800
```

这就解释了使用感受：状态栏显示大约 353K，但会话通常在 335K 左右进入压缩。说它「只有 300K」，大多是在描述这个实际可用区间。

### 372K 又是从哪来的

OpenAI 没有公开解释 GPT-5.6 为什么正好设置成 372K。不过这个数很像一个 500K 总上下文档位扣除了最大输出：

```text
500,000 - 128,000 = 372,000
```

这个推断有历史依据。Codex 过去给 400K 模型配置的是 272K，维护者在 [issue #9429](https://github.com/openai/codex/issues/9429#issuecomment-3774909554) 里明确解释过：模型最多输出 128K，所以输入只留 272K，避免输入加输出超过 400K 后直接报错。

但要说清楚：**「GPT-5.6 在 Codex 中采用 500K 总量档位」目前仍是根据数字和旧规则做出的推断，不是 OpenAI 对 GPT-5.6 的正式说明。** 能确定的事实只有 Codex 下发了 372K 上限。

## 为什么不直接把 105 万全开给 Codex

原因不是模型能力，而是产品取舍。

OpenAI 目前没有发布一份专门解释 GPT-5.6 Codex 上限的公告。下面的原因来自官方计费规则、Codex 源码，以及维护者过去解释同类限制时给出的信息，不把没有公开的内部决策当成事实。

### Codex 订阅和 API 不是同一条用量通道

API 模型页描述的是模型接口能接受多少 token。Codex 则是一个持续调用模型、执行工具、接收结果、再次调用模型的产品，ChatGPT 订阅还要把这些消耗折算进五小时和每周用量。

[Codex 价格页](https://learn.chatgpt.com/docs/pricing#what-are-the-usage-limits-for-my-plan) 也把两种方式分开了：订阅用户按 Codex 用量额度使用，API Key 用户按实际 token 付费。官方还特别说明，模型、上下文、推理、工具调用、检索和缓存都会影响一次任务消耗多少额度。

换句话说，API 能跑 105 万，不等于订阅产品必须让每个会话默认跑满 105 万。

### 百万上下文的成本不是线性小涨

GPT-5.6 的模型页写明：当输入超过 272K 后，**整次请求**的输入按 2 倍价格计算，输出按 1.5 倍计算。不是只给超出的部分加价。

这条规则很关键。Codex 每一轮都会带上当前会话上下文。窗口越大，后续每轮需要处理的前缀越长，订阅额度和服务容量都会更快消耗。

这也不只是猜测。2026 年 4 月，有用户要求 Codex 为 GPT-5.5 开放 1M 上下文。Codex 维护者回复说团队正在做，但需要先完成 [capacity planning](https://github.com/openai/codex/issues/19464#issuecomment-4329299628)，因此无法给出时间表。那条回复说的是 GPT-5.5，不是 GPT-5.6，但它至少确认了「容量」确实是 Codex 开放百万上下文时要解决的问题。

### Codex 要给输出和工具链留安全空间

普通聊天里，一轮输出通常不长。Codex 不一样：模型会推理、调用 shell、读取文件、接收大段日志，再继续生成下一步。系统指令、工具定义、工具结果和模型输出都在抢同一个上下文窗口。

Codex 源码因此默认再留 5% 余量，并提前到 90% 自动压缩。维护者在 2026 年 1 月解释当时的设计时说得更直白：一旦输入和输出溢出，请求会报错并中断会话。提前留空间，就是为了少撞这种错误。

这套策略比较保守，但逻辑很清楚：**Codex 选择的是「较小的活动窗口 + 自动压缩」，不是「一直保留全部原始历史直到 105 万」。**

## 改 `config.toml` 能强行开到 1M 吗

当前不行，至少 ChatGPT 订阅通道不行。

Codex 虽然支持 `model_context_window` 配置，但模型目录同时给 GPT-5.6 写了 `max_context_window: 372000`。加载用户配置时，源码会在 [`model_info.rs`](https://github.com/openai/codex/blob/d2d00b6632dc991aa4471db0529773029cae5d68/codex-rs/models-manager/src/model_info.rs#L23-L31) 中取用户值和模型上限的较小值。填 1,050,000，最后仍会被压回 372,000。

之前已经有人尝试修改客户端缓存和配置。维护者专门提醒，[这个能力必须在服务端实现](https://github.com/openai/codex/issues/19464#issuecomment-4364763432)，客户端绕过会产生无法正常压缩的损坏会话；后来又再次强调，[不存在可靠的客户端配置绕过方法](https://github.com/openai/codex/issues/19464#issuecomment-4392401037)。

如果业务必须使用完整的 922K 输入，目前明确受支持的路径是直接调用 GPT-5.6 的 Responses API，并按 API token 计费。想在 Codex 的订阅、界面、工具链和会话管理里使用完整窗口，只能等 OpenAI 开放服务端档位。

## 这件事真正缺的不是默认 1M

我觉得 35 万作为默认值不一定有问题。大多数编码任务用不到百万上下文，更小的窗口更省额度，自动压缩也能让普通长任务继续跑。

问题在于现在没有选择。

大型仓库分析、长时间调试、跨模块重构这类任务，压缩掉的可能不是闲聊，而是失败记录、环境细节、已经确认的约束和中间结论。压缩可以保留大意，但很难保证每个执行细节都还在。GPT-5.6 发布当天就有人提交了 [35.34 万与 105 万不一致的 issue](https://github.com/openai/codex/issues/31860)，另一个 [feature request](https://github.com/openai/codex/issues/31868) 则希望保留当前默认值，同时提供 800K 或 1.05M 的高消耗可选档。

这个方案比「所有人默认 1M」现实：普通任务继续走便宜、稳定的窗口；确实需要长上下文的人自己承担更高的额度消耗。

截至本文写作时，GPT-5.6 的可选百万上下文还没有开放，相关 issue 也没有维护者给出新的时间表。

## 最后把答案压成一句话

GPT-5.6 的 105 万是 **API 模型能力上限**；Codex 的 30 多万是 **订阅产品为成本、容量和溢出风险设置的活动上下文预算**。当前源码实际是 372K 基数、353.4K 有效窗口、334.8K 自动压缩，不是模型做不到，而是 Codex 暂时没有把完整能力开放出来。

真正值得期待的不是把默认值无脑改成 1M，而是给需要的人一个明确、透明、愿意多付额度就能打开的长上下文档位。
