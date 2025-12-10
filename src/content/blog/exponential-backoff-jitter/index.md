---
title: "拒绝服务雪崩：详解指数退避与随机抖动"
description: "深入探讨如何通过指数退避 (Exponential Backoff) 和随机抖动 (Jitter) 解决惊群效应，实现系统级的平滑流量控制。"
tags: ["TypeScript", "前端", "分布式系统"]
---

在构建高可靠的分布式系统或前端应用时，网络请求的重试机制是必不可少的一环。然而，一个设计拙劣的重试策略，可能会在服务端故障恢复的瞬间，成为压垮系统的"最后一根稻草"。

本文将深入探讨如何通过**指数退避 (Exponential Backoff)** 和**随机抖动 (Jitter)** 两种技术，优雅地解决"惊群效应"。

---

## 问题的根源：惊群效应

想象一个场景：你的 WebSocket 服务因为短暂的网络波动断开了，此刻有 10 万个在线用户。

如果你的前端代码写着：**"连接断开后，等待 1 秒重连。"**

1. **T=0s:** 服务端网络恢复
2. **T=1s:** 10 万个客户端**同时**发起 TCP 连接请求
3. **结果:** 服务端的 CPU 瞬间飙升至 100%，还没来得及处理完第一批请求就再次宕机

这种大量客户端在同一时刻争抢资源的现象，被称为**惊群效应 (Thundering Herd)**。在监控图表上，这表现为可怕的"脉冲式"流量尖峰。

---

## 第一道防线：指数退避

为了解决"死缠烂打"式的频繁重试，我们引入指数退避算法。

### 核心思想

随着重试次数的增加，等待的时间呈指数级增长。这给了服务端喘息和恢复的时间。

### 算法公式

$$Delay = \min(Base \times 2^{Attempt}, MaxDelay)$$

- **Base:** 基础等待时间（如 1 秒）
- **Attempt:** 重试次数（0, 1, 2...）
- **MaxDelay:** 最大等待上限（防止无限等待，如 30 秒）

### 效果

| 重试次数 | 等待时间 |
|---------|---------|
| 第 1 次 | 1s |
| 第 2 次 | 2s |
| 第 3 次 | 4s |
| 第 4 次 | 8s |

### 致命缺陷

虽然指数退避拉长了重试间隔，但它**没有解决同步性问题**。

如果 10 万个用户是在同一时刻断线的（例如服务器重启），那么虽然他们第 2 次重试推迟到了 2 秒后，但到了那一刻，他们依然是**同时**发起请求。流量波峰只是变得稀疏了，但峰值依然很高，像是一个个巨大的海浪拍向服务器。

---

## 终极武器：随机抖动

为了打破这种"集体行动"的同步性，我们需要引入**随机性**。

### 核心思想

在指数退避计算出的等待时间基础上，增加或减少一个随机值。这让每个客户端的重试时间点在时间轴上"错开"，从而将流量洪峰平摊到一段时间窗口内。

### 常见的 Jitter 策略

**Full Jitter (全抖动)** — AWS 推荐的策略，简单且极其有效：

$$Delay = Random(0, \min(Cap, Base \times 2^{Attempt}))$$

**Equal Jitter (等值抖动)** — 保留一半的指数增长保证底线，另一半进行随机：

$$Temp = \min(Cap, Base \times 2^{Attempt})$$
$$Delay = \frac{Temp}{2} + Random(0, \frac{Temp}{2})$$

---

## 代码实战

在 WebSocket 重连或 RPC 轮询中，我们可以封装这样一个通用工具函数。这里采用一种更符合直觉的策略：**在指数基础上，增加 ±20% 的随机波动**。

```typescript
/**
 * 计算带抖动的重试延迟时间
 * @param attempt 当前重试次数 (从 1 开始)
 * @param baseDelay 基础延迟 (ms), 默认 1000
 * @param maxDelay 最大延迟上限 (ms), 默认 30000
 * @param jitterFactor 抖动因子 (0 ~ 1), 默认 0.2 (即上下浮动 20%)
 */
function getBackoffDelayWithJitter(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitterFactor: number = 0.2
): number {
  // 1. 计算指数退避值 (2^n)
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // 2. 限制最大值 (Cap)
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // 3. 计算抖动范围
  // 如果 cappedDelay 是 2000ms，factor 是 0.2
  // 则波动范围是 [-400ms, +400ms]
  const jitterRange = cappedDelay * jitterFactor;
  const randomJitter = (Math.random() * 2 - 1) * jitterRange;

  // 4. 最终结果：保证不小于 0
  return Math.max(0, Math.floor(cappedDelay + randomJitter));
}
```

### 测试效果

```typescript
console.log("模拟 3 个用户同时断线后的重试时间轴：");

for (let i = 1; i <= 3; i++) {
  const userA = getBackoffDelayWithJitter(i);
  const userB = getBackoffDelayWithJitter(i);
  const userC = getBackoffDelayWithJitter(i);
  
  console.log(`第 ${i} 次重试: UserA=${userA}ms, UserB=${userB}ms, UserC=${userC}ms`);
}

/* 输出示例 (完美的错峰):
第 1 次重试: UserA=1920ms, UserB=2150ms, UserC=1850ms
第 2 次重试: UserA=3800ms, UserB=4200ms, UserC=4010ms
第 3 次重试: UserA=7500ms, UserB=8400ms, UserC=7800ms
*/
```

---

## 应用场景

| 场景 | 说明 |
|------|------|
| WebSocket 断线重连 | 交易所 K 线、聊天室、即时通讯。防止服务重启时的"连接风暴" |
| RPC 节点轮询 | Web3 DApp 轮询 `getTransactionReceipt` 时，防止触发 Infura/Alchemy 的 Rate Limit |
| 微服务内部调用 | 防止上游的流量波峰直接透传给下游，导致级联故障 |

---

## 总结

> "Retries without Jitter is a DDoS attack on your own system."
> （没有抖动的重试，就是对自己系统的 DDoS 攻击。）

指数退避解决了重试频率问题，随机抖动解决了同步性问题。两者结合，才是生产环境中健壮的重试策略。
