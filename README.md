# 墨掌柜 Frontend

AI 内容生产与发布工具前端，基于 React 19 + TypeScript + Vite 构建。

## 技术栈

- **React 19** + **TypeScript** - UI 框架
- **Vite 8** - 构建工具
- **Tailwind CSS v4** - 样式框架
- **Tiptap** - 富文本编辑器
- **Zustand** - 状态管理
- **TanStack Query** - 数据获取 / 缓存
- **React Router v7** - 路由
- **Framer Motion** - 动画
- **Radix UI** - 无头 UI 组件
- **React Hook Form + Zod** - 表单验证
- **Axios** - HTTP 客户端
- **Lucide React** - 图标库

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
frontend/src/
├── components/
│   ├── editor/          # 编辑器相关（富文本/Markdown/AI 编辑）
│   ├── generator/       # AI 内容生成（参数配置/模板选择/人设）
│   ├── preview/         # 平台预览（小红书/公众号/知乎）
│   ├── publish/         # 发布对话框/最佳发布时间
│   ├── layout/          # 布局组件（侧边栏/顶栏/页面过渡）
│   ├── ui/              # 通用 UI 组件库
│   └── analysis/        # 数据分析
├── pages/               # 页面级组件
├── stores/              # Zustand 状态管理
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具函数
├── types/               # TypeScript 类型定义
└── styles/              # 全局样式
```

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 用户登录 |
| `/` | 首页 | AI 内容生成工作台 |
| `/contents` | 内容列表 | 所有创作内容 |
| `/contents/:id` | 内容详情 | 编辑 / 预览 / 发布 |
| `/history` | 版本历史 | 内容修改记录 |
| `/calendar` | 内容日历 | 发布计划日历 |
| `/templates` | 模板管理 | Prompt 模板库 |
| `/settings` | 设置页 | 用户配置 |

## 主要功能

- **AI 内容生成** - 支持多种 LLM 提供商（OpenAI / 通义千问 / Mock），可配置人称、风格、受众等参数
- **富文本编辑** - 基于 Tiptap 的所见即所得编辑器，支持 Markdown 切换
- **多平台适配** - 内容可适配小红书、微信公众号、知乎等平台
- **实时预览** - 各平台预览效果
- **模板系统** - 可复用的 Prompt 模板
- **人设管理** - 自定义写作人设
- **版本历史** - 内容修改版本管理
- **内容发布** - 一键发布到多平台
- **热门话题** - 热点话题推荐
- **SEO 分析** - 内容评分与优化建议
