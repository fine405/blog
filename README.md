# Fine's Blog

基于 Astro 构建的个人技术博客。

## ✨ 特性

- 🚀 **Astro 驱动** - 静态生成带来极致性能
- 🏷️ **标签分类** - 文章按标签归类，快速找到感兴趣的内容
- 📅 **Git 时间追踪** - 自动从 Git 提交记录获取发布和更新时间
- 🖼️ **图片灯箱** - 点击图片全屏预览，支持左右导航浏览
- 📡 **RSS 订阅** - 支持 RSS Feed，用你喜欢的阅读器订阅
- 🔍 **SEO 优化** - 完善的 Open Graph 和结构化数据支持
- 💬 **Giscus 评论** - 基于 GitHub Discussions 的评论系统
- 🌓 **主题切换** - 支持亮色/暗色主题，自动跟随系统偏好

## 🧞 命令

| 命令 | 说明 |
| :-- | :-- |
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器 `localhost:4321` |
| `pnpm build` | 构建生产版本到 `./dist/` |
| `pnpm preview` | 本地预览构建结果 |

## 📁 项目结构

```text
/
├── public/          # 静态资源
├── src/
│   ├── components/  # 组件
│   ├── content/     # 博客内容
│   ├── layouts/     # 布局
│   ├── pages/       # 页面
│   └── utils/       # 工具函数
└── package.json
```
