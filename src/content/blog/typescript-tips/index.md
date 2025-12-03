---
title: "TypeScript 实用技巧分享"
description: "分享一些日常开发中常用的 TypeScript 技巧，提升代码质量和开发效率。"
date: 2025-12-02T14:30+08:00
tags: ["TypeScript", "前端"]
---

## 类型推断的妙用

TypeScript 的类型推断非常强大，善用它可以减少冗余代码：

```typescript
// 不需要显式声明类型
const numbers = [1, 2, 3]; // number[]
const user = { name: 'John', age: 30 }; // { name: string; age: number }
```

## 实用工具类型

### Partial 和 Required

```typescript
interface User {
  name: string;
  email: string;
  age?: number;
}

// 所有属性变为可选
type PartialUser = Partial<User>;

// 所有属性变为必需
type RequiredUser = Required<User>;
```

### Pick 和 Omit

```typescript
// 只选择部分属性
type UserBasic = Pick<User, 'name' | 'email'>;

// 排除某些属性
type UserWithoutAge = Omit<User, 'age'>;
```

## 类型守卫

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function process(value: unknown) {
  if (isString(value)) {
    // 这里 value 被推断为 string
    console.log(value.toUpperCase());
  }
}
```

## 泛型约束

```typescript
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(item: T): void {
  console.log(item.length);
}

logLength('hello'); // OK
logLength([1, 2, 3]); // OK
logLength({ length: 10 }); // OK
```

掌握这些技巧，能让你的 TypeScript 代码更加优雅和类型安全。
