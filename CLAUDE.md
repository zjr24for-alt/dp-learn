# DP Learn — 项目提示词（Claude Code / CC Switch）

## 项目概述

DP Learn 是一个面向计算材料学/深度势函数领域的**结构化学习笔记网站**，使用 Next.js 16 (App Router + Turbopack) 构建，TypeScript + Tailwind CSS 4，部署在 GitHub Pages（静态导出）。

核心功能：知识库浏览、命令速查表、论文检索、学习进度追踪、用户笔记、DP-GEN 配置构建器。

## 技术栈

- **框架**: Next.js 16.2.6，App Router，`output: "export"`（GitHub Pages 模式）
- **语言**: TypeScript（严格模式）
- **样式**: Tailwind CSS 4（@tailwindcss/postcss + @tailwindcss/typography）
- **搜索**: Fuse.js 7（客户端全文搜索；索引由服务端构建、经 RSC props 传入客户端，正文不进 JS bundle）
- **Markdown**: react-markdown 10 + remark-gfm + rehype-sanitize（消毒，防 XSS）
- **数学公式**: remark-math + rehype-katex（按需懒加载：内容含公式时才加载 KaTeX 资源）
- **字体**: next/font/local 自托管 Geist（`app/fonts/`，构建离线可用）
- **部署**: GitHub Actions → gh-pages 分支（`STATIC_EXPORT=true` 时静态导出）
- **无数据库**: 用户数据（进度、笔记）存 localStorage

## 项目结构（关键目录）

```
app/                  # 页面路由（App Router）
  page.tsx            # 首页：分类网格 + 搜索 + 最新文章
  learn/page.tsx      # 知识库列表（按 category 筛选）
  learn/[slug]/page.tsx # 文章详情（Markdown 渲染）
  cheatsheet/page.tsx # 速查表（命令快速复制）
  papers/page.tsx     # 论文检索（arXiv API）
  qa/page.tsx         # 智能问答
  progress/page.tsx   # 学习进度
  contribute/page.tsx # 写笔记
  config-builder/page.tsx # DP-GEN 配置编辑器
  tools/page.tsx      # 学习工具索引
  lcurve/page.tsx     # lcurve.out 训练诊断器（粘贴日志→曲线+诊断）
  model-devi/page.tsx # model_devi 偏差分析器（对照 f_trust 判断收敛）
  tutorial/page.tsx   # 从零训练 Cu 势函数端到端教程

content/              # 知识库内容源（TypeScript 导出 Article[]）
  index.ts            # 内容聚合：allArticles + buildAllSearchIndex()
  dpgen-workflow.ts   # DP-GEN 工作流文章
  deepmd-training.ts   # DeePMD 训练文章
  deepmd-quickstart.ts # DeePMD 快速上手
  deepmd-tuning.ts    # DeePMD 调优
  dpgen-handson.ts    # DP-GEN 实战指南
  vasp-hpc.ts         # VASP / 超算
  lammps-deepmd.ts    # LAMMPS + DeePMD
  dpdata-guide.ts     # dpdata 数据转换
  machine-config.ts   # machine.json 配置
  comp-materials.ts   # 计算材料学基础
  atomistic-sim.ts    # 原子模拟
  ovito-tips.ts       # OVITO 可视化
  env-config.ts       # 环境配置
  linux-tips.ts       # Linux 速查
  methodology.ts      # 学习方法论
  cheatsheet.ts       # 速查表条目（CheatsheetItem[]）
  official-docs/      # 官方文档摘要（DocEntry[]）

components/           # React 组件
  markdown/            # Markdown 渲染（react-markdown 封装）
    index.tsx          # 入口：检测公式 → 自动切换轻量/数学渲染器
    light.tsx          # GFM + 消毒（默认路径）
    math.tsx           # + remark-math + rehype-katex（懒加载）
    components.tsx     # 自定义 pre/table/a 组件（代码块复制按钮等）
    schema.ts          # rehype-sanitize 扩展 schema
  home-search.tsx      # 首页搜索区（接收服务端索引，挂载后初始化全局 Fuse）
  category-grid.tsx    # 首页分类网格（进度条水合后渲染）
  recent-articles.tsx  # 首页最近更新（内置 SSR + 并入 IndexedDB 用户笔记）
  learn-browser.tsx    # 知识库列表交互（分类/搜索/排序，接收摘要投影 + 索引 props）
  code-block.tsx       # 通用代码块（语言标签 + 复制按钮）
  diag/                # 诊断工具（lcurve / model_devi）
    line-chart.tsx     # 无依赖 SVG 折线图（支持对数刻度、参考线）
    lcurve-analyzer.tsx  # lcurve 粘贴/上传/诊断/历史
    model-devi-analyzer.tsx # model_devi 分析（f_trust 阈值可调）
lib/                  # 工具库
  types.ts            # 所有 TypeScript 类型定义（Article, Category 等）
  search.ts           # Fuse.js 搜索封装
  lcurve.ts           # lcurve.out 解析 + 训练诊断（纯逻辑，可 Node 测试）
  model-devi.ts       # model_devi.out 解析 + 偏差诊断（纯逻辑，可 Node 测试）
  use-hydrated.ts     # useSyncExternalStore 水合检测 hook
  use-local-storage.ts # 与 localStorage 同步的 React 状态 hook（lint 友好）
  progress-store.ts   # localStorage 进度管理
  user-content-store.ts # localStorage 用户笔记
  arxiv.ts            # arXiv 论文搜索
```

## 内容数据模型

所有知识内容以 TypeScript 对象数组的形式存储在 `content/` 目录：

```typescript
interface Article {
  slug: string;          // URL 路径标识
  title: string;
  category: Category;    // 9 个固定类别之一
  summary: string;
  content: string;       // Markdown 正文
  tags: string[];
}
```

9 个固定类别（`Category` 类型）：`dpgen-workflow` | `deepmd-training` | `vasp-hpc` | `env-config` | `linux-tips` | `methodology` | `comp-materials` | `atomistic-sim` | `ovito-tips`

## 常用命令

```bash
npm run dev          # 开发服务器（localhost:3000）
npm run build        # 生产构建（设置 STATIC_EXPORT=true 启用静态导出）
npm run lint         # ESLint 检查
```

## 部署模式

- **GitHub Pages**: `STATIC_EXPORT=true` → `output: "export"` + `basePath: "/dp-learn"` → `out/` 目录推送到 gh-pages 分支
- **Vercel / 开发**: 默认 serverful 模式，保留 API 路由能力

## 代码规范

1. **添加新文章**: 在 `content/` 对应的 `.ts` 文件中新增 `Article` 对象，确保 `slug` 全局唯一，然后在 `content/index.ts` 的 `allArticles` 中导入
2. **新增类别**: 需同时更新 `lib/types.ts` 的 `Category` 联合类型和 `CATEGORY_META` 记录
3. **组件**: 使用函数组件 + TypeScript，样式用 Tailwind CSS class
4. **无外部 API 依赖**: 搜索和进度全部客户端处理（localStorage），论文检索走 arXiv 公开 API
5. **数学公式**: 行内用 `$E = mc^2$`；块级用**围栏式**（remark-math v6 语法，`$$` 单独成行）：
   ```
   $$
   \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
   $$
   ```
   注意：`$$...$$` 单行写法会被当作行内公式；代码块内的 `$HOME`、`$(date)` 等 shell 变量不会被当作公式

## 注意事项

- Next.js 16 有 breaking changes，修改代码前先查阅 `node_modules/next/dist/docs/` 中的相关文档
- GitHub Pages 静态导出模式下不支持 API 路由和 Server Actions
- `out/` 目录是构建产物，不要手动编辑
- 每篇文章的 `content` 字段是 Markdown 字符串，经 react-markdown 渲染；用户笔记与 AI 回答同样走该渲染器并经过 rehype-sanitize 消毒
- 文章页正文由服务端在构建期渲染进静态 HTML（`app/learn/[slug]/page.tsx` 传 `builtinArticle` 给客户端组件），SEO 与无 JS 场景可用；用户笔记（IndexedDB）仍为客户端加载
- 文章页已有 `generateMetadata`（标题/描述/OG/canonical）与 JSON-LD Article 结构化数据
- 配置构建器（`lib/dpgen-config/`）包含 INCAR / param / machine 的 JSON Schema 校验
