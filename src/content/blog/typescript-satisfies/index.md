---
title: "完全掌握 TypeScript satisfies 操作符"
description: "深入理解 TypeScript 4.9 引入的 satisfies 操作符，掌握类型验证与类型推断的完美平衡。"
tags: ["TypeScript", "前端"]
---

TypeScript 4.9 引入了 `satisfies` 操作符，解决了一个长期困扰开发者的问题：**如何在验证类型的同时保留精确的类型推断？**

这篇文章将带你完全掌握 `satisfies` 的用法和最佳实践。

---

## 问题背景：类型注解的局限

在 `satisfies` 出现之前，我们通常用类型注解来约束变量：

```typescript
type Colors = 'red' | 'green' | 'blue';
type ColorValue = string | [number, number, number];

const palette: Record<Colors, ColorValue> = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
};
```

这样做有两个问题：

### 问题 1：丢失精确类型

```typescript
// palette.red 的类型是 string | [number, number, number]
// 而不是 [number, number, number]
palette.red.map(x => x * 2);
//          ^^^ 报错：类型 string | [number, number, number] 上不存在 map
```

TypeScript 只知道 `palette.red` 是 `ColorValue`，不知道它具体是数组。

### 问题 2：无法检测拼写错误

```typescript
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
  bleu: [0, 0, 255],  // 拼写错误，但没有类型注解时不会报错
};
```

---

## satisfies 的解决方案

`satisfies` 操作符让你**同时获得类型验证和精确推断**：

```typescript
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} satisfies Record<Colors, ColorValue>;

// ✅ red 被推断为 [number, number, number]
palette.red.map(x => x * 2);

// ✅ green 被推断为 string
palette.green.toUpperCase();

// ✅ 拼写错误会被检测到
const badPalette = {
  red: [255, 0, 0],
  bleu: '#0000ff',  // ❌ 报错：对象字面量只能指定已知属性
} satisfies Record<Colors, ColorValue>;
```

---

## 核心概念：验证 vs 推断

理解 `satisfies` 的关键是区分**类型验证**和**类型推断**：

| 方式 | 类型验证 | 类型推断 |
|------|---------|---------|
| `const x: Type = value` | ✅ 验证 value 符合 Type | ❌ x 的类型固定为 Type |
| `const x = value satisfies Type` | ✅ 验证 value 符合 Type | ✅ x 保留 value 的精确类型 |

简单说：
- **类型注解**：「这个变量的类型是 X」
- **satisfies**：「这个值符合 X 的约束，但保留它本来的类型」

---

## 实战场景

### 场景 1：配置对象

```typescript
interface AppConfig {
  apiUrl: string;
  timeout: number;
  features: {
    darkMode: boolean;
    analytics: boolean;
  };
}

// 使用 satisfies 验证配置完整性
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  features: {
    darkMode: true,
    analytics: false,
  },
} satisfies AppConfig;

// 如果漏掉任何字段，TypeScript 会报错
// config.apiUrl 的类型是 string（不是字面量类型）
// 如果需要字面量类型，要配合 as const 使用
```

### 场景 2：路由定义

```typescript
type RouteKey = 'home' | 'about' | 'blog' | 'contact';

interface RouteConfig {
  path: string;
  title: string;
  auth?: boolean;
}

const routes = {
  home: { path: '/', title: '首页' },
  about: { path: '/about', title: '关于' },
  blog: { path: '/blog', title: '博客' },
  contact: { path: '/contact', title: '联系', auth: true },
} satisfies Record<RouteKey, RouteConfig>;

// ✅ 确保所有路由都已定义
// ✅ routes.home.path 的类型是 '/'（字面量类型）
```

### 场景 3：状态机

```typescript
type State = 'idle' | 'loading' | 'success' | 'error';

interface StateConfig {
  message: string;
  canRetry: boolean;
}

const stateMessages = {
  idle: { message: '等待操作', canRetry: false },
  loading: { message: '加载中...', canRetry: false },
  success: { message: '操作成功', canRetry: false },
  error: { message: '操作失败', canRetry: true },
} satisfies Record<State, StateConfig>;

// 如果新增一个 State，忘记添加对应配置会报错
```

### 场景 4：主题颜色

```typescript
type ThemeColor = 'primary' | 'secondary' | 'accent' | 'background' | 'text';

const lightTheme = {
  primary: '#0066cc',
  secondary: '#6c757d',
  accent: '#ff6b6b',
  background: '#ffffff',
  text: '#1a1a2e',
} satisfies Record<ThemeColor, string>;

const darkTheme = {
  primary: '#4dabf7',
  secondary: '#a0a0a0',
  accent: '#ff8787',
  background: '#1a1a2e',
  text: '#eaeaea',
} satisfies Record<ThemeColor, string>;

// 两个主题都必须包含所有颜色键
```

### 场景 5：API 响应处理

```typescript
type ApiStatus = 'success' | 'error' | 'pending';

const statusHandlers = {
  success: (data: unknown) => console.log('成功:', data),
  error: (data: unknown) => console.error('错误:', data),
  pending: (data: unknown) => console.log('处理中...'),
} satisfies Record<ApiStatus, (data: unknown) => void>;

// 确保每个状态都有对应的处理函数
function handleResponse(status: ApiStatus, data: unknown) {
  statusHandlers[status](data);
}
```

---

## satisfies 与 as const 组合

`satisfies` 和 `as const` 可以组合使用，获得最精确的类型：

```typescript
const config = {
  apiUrl: 'https://api.example.com',
  retries: 3,
  methods: ['GET', 'POST'],
} as const satisfies {
  apiUrl: string;
  retries: number;
  methods: readonly string[];
};

// config.apiUrl 的类型是 'https://api.example.com'（字面量）
// config.retries 的类型是 3（字面量）
// config.methods 的类型是 readonly ['GET', 'POST']
```

注意顺序：`as const` 要放在 `satisfies` 前面。

---

## 常见误区

### 误区 1：satisfies 不会改变运行时行为

`satisfies` 是纯粹的类型检查，不会影响编译后的 JavaScript：

```typescript
// TypeScript
const x = { a: 1 } satisfies { a: number };

// 编译后的 JavaScript
const x = { a: 1 };
```

### 误区 2：satisfies 不能用于变量声明的类型位置

```typescript
// ❌ 错误用法
let x satisfies number = 1;

// ✅ 正确用法
let x = 1 satisfies number;
```

### 误区 3：satisfies 不会「收窄」类型

`satisfies` 只验证类型兼容性，不会把类型变窄：

```typescript
const value = Math.random() > 0.5 ? 'hello' : 42;

// value 的类型仍然是 string | number
const checked = value satisfies string | number;
```

---

## 什么时候用 satisfies？

| 场景 | 推荐方式 |
|------|---------|
| 需要精确的字面量类型 | `satisfies` |
| 配置对象、路由表、状态映射 | `satisfies` |
| 函数参数类型约束 | 类型注解 |
| 函数返回值类型 | 类型注解 |
| 类属性类型 | 类型注解 |
| 需要类型收窄 | 类型注解 |

简单原则：**当你想「验证」而不是「声明」类型时，用 `satisfies`**。

---

## 总结

`satisfies` 操作符填补了 TypeScript 类型系统的一个重要空白：

1. **验证类型约束**：确保值符合预期的类型结构
2. **保留精确推断**：不丢失字面量类型和具体类型信息
3. **更好的开发体验**：拼写错误、遗漏字段都能被检测到

下次当你写配置对象、路由表、主题定义时，试试 `satisfies`，你会爱上它的。

```typescript
const conclusion = {
  learned: true,
  nextStep: '在项目中实践',
} satisfies { learned: boolean; nextStep: string };
```
