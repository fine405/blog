

# 📝 前端架构师进阶：SDK 设计系列博客 - AI 写作生成指南

## 1. 全局设定 (Global Context)

**请在开始生成任何一篇文章前，先读取以下全局设定：**

* **你的角色**：阿里巴巴/字节跳动 P8 级别的资深前端架构师，拥有丰富的各种 SDK（监控、埋点、即时通讯、组件库）设计与落地经验。
* **目标读者**：3-5 年经验的中高级前端开发工程师，他们有基础业务能力，但缺乏架构思维和工程化深度。
* **写作风格**：
* **硬核干货**：拒绝正确的废话，直击痛点。
* **深度优先**：不仅展示“怎么做（How）”，更要解释“为什么这么做（Why）”以及“有哪些替代方案（Alternatives）”。
* **图文并茂**：对于复杂架构，使用 Mermaid 语法或文字描述提示插入架构图。
* **代码为王**：代码示例必须是 **Production-Ready** 级别的 TypeScript 代码，包含详细注释，严禁使用 `console.log('hello world')` 这种玩具代码。


* **格式要求**：Markdown 格式，使用 Emoji 增加可读性，关键概念加粗。

---

## 2. 系列规划地图 (Series Roadmap)

请知悉当前系列分为三个部分，共 7 篇文章。在写作某一篇文章时，需要关注上下文关联。

* **Part 1: 通用架构篇 (The Core)**
* 1. 《SDK 设计思维：从“写业务”到“造轮子”的认知跨越》


* 2. 《微内核架构：如何设计高扩展的 SDK 插件系统》


* 3. 《与宿主共舞：SDK 的隔离、通信与安全》




* **Part 2: 工程化与体验篇 (Engineering)**
* 4. 《构建的艺术：Rollup、Tree-shaking 与 Polyfill 策略》


* 5. 《极致 DX：TypeScript 类型体操与自动化文档》




* **Part 3: 实战扩展篇 (Case Study - 监控方向)**
* 6. 《实战监控 SDK (上)：数据采集的黑魔法》


* 7. 《实战监控 SDK (下)：高可靠数据传输层设计》





---

## 3. 分篇生成指令 (Step-by-Step Prompts)

**使用方法**：每次生成一篇，复制对应的 Prompt 发送给 AI。

### 📌 第 1 篇：设计思维

**Prompt:**

> 请以“P8 架构师”的口吻撰写系列博客第 1 篇：《SDK 设计思维》。
> **核心内容要求**：
> 1. 开篇点明 App 开发（ToC）与 SDK 开发（ToD）的本质区别：控制权反转。
> 2. 详细阐述 SDK 设计的 **"4S" 标准** (Stability, Simplicity, Size, Security)，每个标准给出一个反面教材（例如：全局变量污染导致业务白屏）。
> 3. 重点讲解 **Snippet（代码片段）+ Async Queue（异步队列）** 的设计模式。
> 
> 
> * 解释为什么 Google Analytics 等大厂都这么做。
> * 提供一段通过 `window.MySDK.push()` 实现无阻塞加载的标准代码实现。
> 
> 
> 4. 结语强调：SDK 开发是“带着镣铐跳舞”。
> 
> 

### 📌 第 2 篇：微内核架构

**Prompt:**

> 请撰写系列博客第 2 篇：《微内核架构与插件系统》。
> **核心内容要求**：
> 1. 痛点引入：随着功能增加，SDK 体积膨胀，如何解决？
> 2. 架构设计：绘制（或描述） **Core + Plugin** 的架构图。Core 只负责生命周期、事件总线和配置；Plugin 负责业务。
> 3. **代码实战**（重点）：
> 
> 
> * 定义 `Plugin` 接口（TypeScript）。
> * 实现 `Core` 类中的 `use()` 方法和生命周期钩子 (`onInit`, `afterInit`)。
> * 展示一个简单的 `LoggerPlugin` 插件是如何注入并拦截数据的。
> 
> 
> 4. 扩展讨论：中间件模式（Middleware）在处理请求流水线中的应用。
> 
> 

### 📌 第 3 篇：隔离与通信

**Prompt:**

> 请撰写系列博客第 3 篇：《SDK 的隔离、通信与安全》。
> **核心内容要求**：
> 1. **CSS 隔离**：对比 CSS Modules 前缀、Shadow DOM、Iframe 三种方案的优劣，给出推荐场景。
> 2. **JavaScript 隔离**：如何防止修改原生原型链？如何实现 Global Error Boundary（全局 `try-catch` 装饰器）确保 SDK 崩溃不影响宿主？
> 3. **通信机制**：
> 
> 
> * 内部通信：实现一个轻量级的 `EventEmitter`（发布订阅）。
> * 跨窗口通信（如果是 Widget 类 SDK）：`postMessage` 的安全封装（必须校验 `origin`）。
> 
> 

### 📌 第 4 篇：工程化构建

**Prompt:**

> 请撰写系列博客第 4 篇：《构建的艺术：Rollup 与 Tree-shaking》。
> **核心内容要求**：
> 1. **工具选型**：深度对比 Webpack vs Rollup vs Vite。结论：库开发首选 Rollup。
> 2. **配置实战**：
> 
> 
> * 提供一份生产环境的 `rollup.config.ts` 代码。
> * 演示如何同时输出 ESM (供现代构建工具使用)、CJS (Node环境)、UMD (浏览器直接引用) 三种格式。
> 
> 
> 3. **体积优化**：
> 
> 
> * 详解 `package.json` 中的 `sideEffects: false` 配置及其对 Tree-shaking 的影响。
> * 依赖管理策略：`dependencies` vs `peerDependencies`，如何把 lodash 这种巨型库排除在打包之外。
> 
> 

### 📌 第 5 篇：TypeScript 与 DX

**Prompt:**

> 请撰写系列博客第 5 篇：《极致开发者体验：TS 类型体操》。
> **核心内容要求**：
> 1. 观点：最好的文档不是 Wiki，而是 IDE 里的智能提示。
> 2. **TS 实战技巧**：
> 
> 
> * 使用泛型 `<T>` 约束 `track` 方法的参数，实现业务方自定义事件的类型提示。
> * 如何生成干净的 `.d.ts` 类型声明文件。
> 
> 
> 3. **版本管理**：SemVer 语义化版本规范在 SDK 发布中的具体执行策略（Breaking Change 的处理）。
> 
> 

### 📌 第 6 篇：监控实战（采集篇）

**Prompt:**

> 请撰写系列博客第 6 篇：《实战监控 SDK (上)：数据采集》。
> **特别注意**：本篇必须基于第 2 篇设计的“微内核架构”来编写，将监控功能作为 `Plugin` 实现。
> **核心内容要求**：
> 1. **无感采集原理**：
> 
> 
> * **Monkey Patching**：如何安全地劫持 `XMLHttpRequest` 和 `fetch`？（附代码：注意保存原方法引用）。
> * **路由监听**：SPA 应用中 `history.pushState` 和 `hashchange` 的监听技巧。
> 
> 
> 2. **代码实战**：
> 
> 
> * 编写一个 `ErrorPlugin`，通过 `window.addEventListener('error')` 和 `unhandledrejection` 捕获错误。
> * 编写一个 `PerformancePlugin`，利用 `PerformanceObserver` 采集 Web Vitals (FCP, LCP)。
> 
> 

### 📌 第 7 篇：监控实战（传输篇）

**Prompt:**

> 请撰写系列博客第 7 篇：《实战监控 SDK (下)：高可靠传输》。
> **核心内容要求**：
> 1. **核心痛点**：页面卸载（Unload）时的数据丢失问题。
> 2. **架构设计**：实现一个独立的 `Transport` 模块。
> 3. **代码实战（核心高潮）**：
> 
> 
> * 实现 **黄金降级策略**：`navigator.sendBeacon` -> `fetch({keepalive: true})` -> `XHR` -> `LocalStorage` 兜底。
> * 实现 **调度器 (Scheduler)**：包含 `Buffer` 缓冲队列（攒够 10 条发）和 `requestIdleCallback` 空闲发送逻辑。
> 
> 
> 4. **解耦设计**：再次强调“信封模式”和“接入网关”，解释为什么 SDK 不直接对接数据库。
> 
> 

---

## 4. 质量检查与迭代 (Quality Control)

生成文章后，请根据以下标准进行快速检查（Review），如有不足可要求 AI 修改：

1. **代码是否可运行？** 检查是否遗漏了关键的 import 或类型定义。
2. **逻辑是否自洽？** 第 6 篇的插件写法是否符合第 2 篇定义的接口？
3. **是否有图？** 复杂的流程（如降级策略、插件加载）是否提示了需要插图的位置？
4. **Tone Check**：语气是否太像教科书？要求它更像“老司机”之间的对话，多一些实战经验的 Tips 和避坑指南。
