# DP Learn 优化路线图

> 状态：P0-1、P0-2、P0-3、P0-4 已完成（2026），其余规划中
> 依据：2026 年代码通读 + Next.js 16.2.6 自带文档（`node_modules/next/dist/docs/`）核对
> 原则：先修正确性（P0），再统一部署（P1），最后增强体验（P2）；每项都有明确验收标准，做完一项合一项，避免大爆炸式重构。

---

## 1. 现状盘点（已核实，非猜测）

| 维度 | 现状 | 证据位置 |
|---|---|---|
| 文章页渲染 | 正文在 client 端 `useEffect` 后才渲染；静态 HTML 只有"加载中…"占位 | `app/learn/[slug]/article-content.tsx:20-23, 73-79` |
| Markdown 渲染 | 自定义正则渲染器，脆弱、无嵌套支持、无转义 | `lib/render-markdown.ts` |
| KaTeX 数学公式 | 依赖已装（`katex@0.17`）但**完全未使用**，`$...$`/`$$...$$` 不渲染 | `package.json:13`；全项目 grep 仅 `globals.css:23` 有样式覆盖 |
| 安全 | 用户笔记正文经 `dangerouslySetInnerHTML` 注入且渲染器不转义 HTML → **XSS 风险** | `article-content.tsx:166`；`lib/render-markdown.ts` |
| 包体积 | 首页/文章页/QA 页均为 client component，直接 `import allArticles`（~218KB）+ 官方文档 + 速查表全部进客户端 bundle | `app/page.tsx:1,5`；`article-content.tsx:5`；`components/qa-chat.tsx:8` |
| 搜索索引 | `buildAllSearchIndex()` 在首页和每篇文章页 mount 时重复构建 Fuse 实例 | `app/page.tsx:20-21`；`article-content.tsx:26` |
| 静态搜索索引 | `app/search-index/route.ts`（`force-static`）已存在但页面未使用 | `app/search-index/route.ts` |
| 站点 URL | sitemap/robots/metadata 写死 `https://dp-learn.vercel.app`，与 GitHub Pages（`/dp-learn` basePath）不一致 | `app/layout.tsx:20`；`app/sitemap.ts:4`；`app/robots.ts:10`；`next.config.ts:10` |
| GitHub Pages 功能缺口 | CI 构建前 `rm -rf app/api`；QA 的 AI 增强（`/api/ai`）、论文检索主路（`/api/arxiv` 代理）在静态部署下失效 | `.github/workflows/deploy.yml:23`；`lib/ai-qa.ts:6,197`；`lib/arxiv.ts:96` |
| 文章级 metadata | 无 `generateMetadata`、无 JSON-LD、无 OG 图，所有文章共享站级默认标题 | `app/learn/[slug]/page.tsx` |
| 字体 | Geist 已通过 `next/font` 自托管 ✅（无需改动） | `app/layout.tsx:2` |
| 构建产物 | `out/` ~2.8MB / 397 文件，最大 chunk 227KB | `next build` 实测 |

---

## 2. 优先级总览

### P0 — 正确性与核心体验（建议 2~4 周内完成）

| 编号 | 项 | 解决的问题 | 依赖 |
|---|---|---|---|
| P0-1 | 重写 Markdown 渲染器（react-markdown + remark-gfm + rehype-katex + sanitize） | KaTeX 不生效、XSS、渲染器脆弱 | 无 |
| P0-2 | 文章正文服务端渲染（构建时输出 HTML） | 文章页 SEO 为空、首屏"加载中" | P0-1 |
| P0-3 | 文章级 `generateMetadata` + JSON-LD | 搜索收录质量、分享预览 | P0-2 |
| P0-4 | 搜索索引静态化 + 客户端包瘦身 | 每个页面都打包全部内容、索引重复构建 | 无（可与 P0-1 并行） |

### P1 — 部署一致性（1~2 周）

| 编号 | 项 | 解决的问题 |
|---|---|---|
| P1-1 | 站点 URL 环境变量化（`NEXT_PUBLIC_SITE_URL`） | 双部署 canonical 分裂 |
| P1-2 | GitHub Pages 功能对齐（论文检索 / QA 决策） | 静态部署下 QA、论文检索不可用 |

### P2 — 体验增强（按需排期）

| 编号 | 项 |
|---|---|
| P2-1 | OG 分享图（opengraph-image 或动态生成） |
| P2-2 | 长文目录 TOC（锚点导航 + SEO 锚点） |
| P2-3 | 代码块语法高亮（服务端渲染，避免体积膨胀） |
| P2-4 | 无障碍：skip-link、搜索键盘导航、`prefers-reduced-motion`、焦点可见性 |

---

## 3. 详细方案

### P0-1 重写 Markdown 渲染器 ✅ 已完成

**问题**
- `lib/render-markdown.ts` 是纯正则管道：不处理数学公式；表格单元格内不支持行内格式；不转义正文中的原始 HTML，用户笔记可注入 `<script>` / `<img onerror>`，最终经 `dangerouslySetInnerHTML` 执行。
- 该渲染器被 `article-content.tsx` 与 `qa-chat.tsx` 共用，改一处两处受益。

**已实施内容**（见 `components/markdown/`）
- 引入 `react-markdown@10` + `remark-gfm` + `rehype-sanitize`（扩展 schema，保留 KaTeX 类名与 `style`）+ `remark-math` + `rehype-katex`（`output: "html"`）。
- KaTeX 懒加载：`index.tsx` 先剔除代码块再检测 `$` 分隔符，仅在含公式时动态加载 `math.tsx`（含 katex CSS 独立 chunk）。当前内容无公式，正常页面不加载任何 KaTeX 资源。
- 自定义组件：`pre`（语言标签 + 复制按钮，复用 `components/copy-button.tsx`，React onClick 替代原事件委托）、`table`（横向滚动容器）、`a`（外链新窗口）。
- 替换 4 个调用点：文章页 `article-content.tsx`、QA `qa-chat.tsx`、论文对话 `paper-chat.tsx`、编辑器预览 `article-editor.tsx`；删除 `lib/render-markdown.ts`。
- 新增 `scripts/markdown-smoke.mjs`（管线 + XSS 冒烟）与 `scripts/render-regression.mjs`（123 项内容逐篇渲染回归）。
- 顺带修复静态导出阻塞：`app/sitemap.ts`、`app/robots.ts` 加 `force-static`（此前 GH Pages 构建在 sitemap.xml 处失败）；`app/layout.tsx` 改用 `next/font/local` 自托管 Geist（`app/fonts/`），消除构建期对 Google Fonts 的网络依赖。

**验收结果**
1. ✅ 含 `$$...$$` 围栏式块级公式与 `$...$` 行内公式均正确渲染（KaTeX 输出类名完整保留）
2. ✅ XSS 测试：`<script>`、`<img onerror>`、`javascript:` 链接、原始 HTML 的 `onclick` 全部被拦截
3. ✅ 表格、嵌套列表、引用、代码块（含 shell 变量）渲染正常，视觉保持 zinc 风格
4. ✅ `npm run lint`（新文件零告警）、`npx tsc --noEmit`、`STATIC_EXPORT=true npm run build` 全部通过；懒加载验证：文章页 HTML 不静态引用 katex chunk

> 遗留：内容作者注意 remark-math v6 块级公式为**围栏式**语法（`$$` 单独成行），`$$...$$` 单行是行内公式（已写入 CLAUDE.md）。

---

### P0-2 文章正文服务端渲染 ✅ 已完成

**问题**
- `app/learn/[slug]/page.tsx` 是 server component，但只渲染 `<ArticleContent>`（client component）。client 组件初始 `loading=true`，正文在 `useEffect` 后才出现 → 静态导出的 `out/learn/*.html` 正文区是占位符：搜索引擎抓不到内容，用户先看"加载中"。

**已实施内容**
- `page.tsx`（server）：`getArticleBySlug` 取文章 → 作为 `builtinArticle` prop 传给客户端组件；上/下篇导航改为服务端计算（`getNavArticles`，同类别按文件顺序，客户端不再需要 `allArticles`）；`params` 用 Promise 签名（Next 16 规范）。
- `article-content.tsx`（client）：删除 `loading`/`mounted` 门控与 `buildSearchIndex` 调用（P0-4 顺带项）——内置文章首帧即可渲染，SSR 时正文直接输出进静态 HTML；`ProgressCheck` 自带挂载门控，无需父级 `mounted`；仅用户笔记（IndexedDB）保留客户端加载流程。
- `components/markdown/index.tsx`：动态导入去掉 `ssr: false`，公式内容也能构建期渲染进静态 HTML（客户端仍按需加载 katex chunk）。

**验收结果**
1. ✅ `out/learn/*.html`（48 篇）均含完整正文：h1、prose 结构（h2/p/表格/代码块外壳）、JSON-LD、meta description、canonical（`scripts/verify-static-articles.mjs` 全量验证，0 失败）
2. ✅ 正文随 HTML 输出，禁用 JS 亦可见完整内容
3. ✅ 交互（进度、复制、上下篇跳转）逻辑不变；`tsc` 通过、改动文件 lint 零告警（顺带消除了原 `setMounted`/`setLoading` 的 set-state-in-effect 报错）
4. ✅ 懒加载回归：文章页仍不静态引用 katex chunk；内容渲染回归 123 项 0 失败

> 说明：静态 HTML 中出现的"加载中…"来自 `app/loading.tsx` 全局 Suspense 模板（所有页面都有，属 Next 静态导出正常行为），与文章正文无关。

---

### P0-3 文章级 metadata + JSON-LD ✅ 已完成

**问题**
- 所有文章页共用站级 `<title>` 模板与默认描述；无 OG 标题/描述；无结构化数据 → 搜索引擎只能凭 URL 猜页面主题。

**已实施内容**
- `page.tsx` 导出 `generateMetadata`：`title` = 文章标题（套用站级模板）、`description` = `article.summary`、`alternates.canonical`（经 metadataBase 解析）、`openGraph`（type: article + publishedTime/modifiedTime）、`twitter`。
- 正文前注入 JSON-LD Article（headline/description/datePublished/dateModified/keywords/author），`<` 转义防 script 提前闭合。
- sitemap 的 `lastModified` 仍为构建时 `new Date()`（P1-1 将统一为内容时间戳）。

---

### P0-4 搜索索引静态化 + 客户端包瘦身 ✅ 已完成

**问题**
- `app/page.tsx`、`article-content.tsx`、`qa-chat.tsx` 都是 client component 且直接 import 全部内容 → 每个页面下载完整知识库 JS。
- 搜索索引在每次页面 mount 时重建（`page.tsx:20-21`、`article-content.tsx:26`），浪费 CPU。
- 已有 `app/search-index/route.ts`（`force-static`，静态导出时生成 JSON 文件），但无人消费。

**方案与原计划差异（重要）**
- 原方案 A 是"构建期写 JSON + 客户端 fetch（处理 basePath）"。实测发现 `useRouter().basePath` 在 Next 16 不存在、`process.env.__NEXT_ROUTER_BASEPATH` 是内部变量不适合业务代码依赖，fetch 方案的 basePath 处理风险高。
- **最终采用 RSC props 传递**：服务端组件在构建期调用 `buildAllSearchIndex()`，把索引数组作为 props 传给客户端组件（数据进入 HTML 的 RSC payload，**不进 JS bundle**）——彻底绕开 basePath/fetch，搜索保持即时响应。代价：首页/learn/QA 三个页面的 HTML 各多 ~128KB 原始（gzip 后 ~35KB），可接受。

**已实施内容**
- `content/index.ts`：`buildAllSearchIndex` 改为**全量正文**（原截断 2000 字符；实测全量只多 ~11KB，搜索与 QA 检索质量都更好）。
- `lib/search.ts`：新增 `articleToSearchIndexItem`（用户笔记→索引项）与 `initSearchIndex`（内置索引 + 追加用户笔记，幂等）。
- 新建 `lib/use-hydrated.ts`（`useSyncExternalStore` 水合检测，替代 setState-in-effect 模式）。
- **首页拆层**（`app/page.tsx` 改 server）：Hero/分类/最近更新/特性区静态渲染；新组件 `HomeSearch`（接收索引，挂载后初始化）、`CategoryGrid`（进度条水合后渲染）、`RecentArticles`（内置 SSR + 并入用户笔记）。
- **learn 页拆层**（`app/learn/page.tsx` 改 server）：新组件 `LearnBrowser` 接收 `articles`（摘要投影 `ArticleSummary`，不含正文）+ `indexItems`。
- **QA 页**（`app/qa/page.tsx` 改 server）：`QAChat` 接收 `indexItems`，移除对 `allArticles/cheatsheetItems/officialDocs` 的 import；`lib/search-qa.ts` 重构为基于 `SearchIndexItem[]` 检索（保留 Fuse 缓存与 title/全文权重）。
- 新增 `ArticleSummary` 类型（`Pick<Article, ...>`，列表卡片专用），`ArticleCard` 改用该类型。
- `app/search-index/route.ts` 保留（全量内容，作为公开 API/调试用）。

**验收结果**
1. ✅ 首页 JS chunks **不再包含任何文章正文**（脚本逐 chunk 检索验证）；正文只存在于 HTML RSC payload
2. ✅ 搜索行为一致：真实索引 6 组查询全部命中预期文章；用户笔记追加索引逻辑保留（`initSearchIndex`）
3. ✅ QA 检索一致：问题"LAMMPS 里怎么加载 DeepMD 势函数"正确命中"LAMMPS + DeePMD 集成"
4. ✅ GitHub Pages 无 basePath 问题（prop 传递，无 fetch 路径）；静态导出构建通过，文章页 48/48 回归通过
5. ✅ `tsc` 通过、改动文件 lint 零告警、内容渲染回归 123 项 0 失败

> 遗留：`app/cheatsheet/page.tsx` 与 `app/progress/page.tsx` 仍直接 import 内容（各自页面级 chunk，不影响首页首包）；后续可用同样模式改造（cheatsheet 传 `CheatsheetItem[]`、progress 传摘要投影）。

---

### P1-1 站点 URL 环境变量化

**问题**
- `SITE.url`（`layout.tsx:20`）、sitemap BASE（`sitemap.ts:4`）、robots sitemap（`robots.ts:10`）写死 Vercel 域名；GitHub Pages 部署在 `https://zjr24for-alt.github.io/dp-learn/`。

**方案**
- 新增 `.env.example`：`NEXT_PUBLIC_SITE_URL=https://dp-learn.vercel.app`（Vercel 用）与 `NEXT_PUBLIC_SITE_URL=https://zjr24for-alt.github.io/dp-learn`（GH Pages 用，CI 中注入）。
- 三处统一读取该变量；metadataBase、canonical、sitemap、robots、JSON-LD（P0-3）全部走它。
- 建议同时决策**主域名**：GH Pages 免费稳定但功能受限（见 P1-2），若 Vercel 是主阵地，GH Pages 可考虑 301/说明页；若 GH Pages 是主阵地，QA/论文功能需按 P1-2 改造。

**涉及文件**：`next.config.ts`、`app/layout.tsx`、`app/sitemap.ts`、`app/robots.ts`、`.github/workflows/deploy.yml`、新增 `.env.example`
**工作量**：S
**验收标准**
1. 两套环境各构建一次，产物中 URL 正确指向各自域名/路径
2. sitemap.xml、robots.txt、canonical、JSON-LD 一致无分裂

---

### P1-2 GitHub Pages 功能对齐（论文检索 / QA）

**问题**
- CI 删除 `app/api` 后：QA 的 AI 增强（`/api/ai`，`ai-qa.ts:6,197`、`paper-chat.tsx:23`）完全失效；论文检索主路 `/api/arxiv` 代理失效，仅剩 S2/OpenAlex 浏览器直连兜底（限流更易触发）。

**方案（三选一，需拍板）**
1. **浏览器直连 DeepSeek**：`ai-qa.ts` 改为直接 `fetch('https://api.deepseek.com/...')`（API Key 本就在 localStorage，无新增暴露面）。需实测 `api.deepseek.com` 是否允许 CORS；不允许则此路不通。
2. **改为"静态部署友好"的代理源**：论文检索去掉自建代理，主路直接 arXiv（CORS 不支持）→ 需换用支持 CORS 的 arXiv 镜像/服务，或接受 S2/OpenAlex 双路。
3. **以 Vercel 为主部署**：GH Pages 仅保留内容浏览类页面（QA/论文页显示"请访问主站"提示），CI 停止删除 `app/api`（避免未来误删）。

**涉及文件**：`lib/ai-qa.ts`、`lib/arxiv.ts`、`.github/workflows/deploy.yml`
**工作量**：S~M
**验收标准**
1. 部署目标明确且有文档记录
2. GH Pages 上 QA 与论文检索的功能状态与主站一致，或明确降级提示

---

### P2 体验增强（简列）

- **P2-1 OG 分享图**：用 `opengraph-image`（App Router 内建，可服务端生成 SVG/PNG，静态导出可用）生成带文章标题的分享图。
- **P2-2 目录 TOC**：渲染器产出 heading 列表，文章页右侧/顶部锚点导航；heading 加 `id`，配合 `scroll-margin-top`。
- **P2-3 代码高亮**：服务端用 rehype-highlight / shiki（构建期着色，不增加客户端 JS）。
- **P2-4 无障碍**：`<a class="skip-link">` 跳到主内容；搜索结果为 `<ul>` + 键盘上下键导航（现状需读 `search-bar.tsx` 确认）；全局 `prefers-reduced-motion` 媒体查询。

---

## 4. 实施顺序与依赖

```
Phase 0  基线测量（半天）
         记录：npm run build 产物体积、Lighthouse 首页/文章页分数、out/learn/*.html 是否含正文
         └─ 便于完成后对比

Phase 1  P0-1 渲染器重写 ──► P0-2 文章页 SSR ──► P0-3 metadata/JSON-LD
         （串行：P0-2 依赖 P0-1 的服务端渲染能力；P0-3 依赖 P0-2 的 page.tsx 改造）
         并行轨道：P0-4 搜索索引静态化 + 包瘦身（与 P0-1~3 无强依赖，可同时进行）

Phase 2  P1-1 URL 环境变量化 ──► P1-2 功能对齐（P1-2 的"主阵地"决策影响 P1-1 默认值，先决策再实施）

Phase 3  P2 各项（依赖 P0-1 的渲染器管道；按需排期）
```

**关键决策点（需产品拍板，不阻塞 P0）**
1. 主部署阵地：Vercel 还是 GitHub Pages？（影响 P1-1 默认值与 P1-2 方案选择）
2. 数学公式是否必须？（影响 P0-1 中 KaTeX 的资源加载策略与体积权衡）
3. QA 的 DeepSeek 集成是否需要在 GH Pages 可用？（影响 P1-2 方案 1/3 的选择）

---

## 5. 风险与注意事项

1. **Next.js 16 有 breaking changes**：任何代码改动前先查 `node_modules/next/dist/docs/` 对应章节（本路线图已据此核对：静态导出支持 Server Components 与 GET Route Handler 生成静态文件；不支持 API 路由、Server Actions、默认 Image Optimization）。
2. **react-markdown 生态版本**：确认 `react-markdown@9+` 与 React 19 兼容；`rehype-katex` 需要配套 CSS（`katex/dist/katex.min.css` 可 `import` 进 globals.css 或按需）。
3. **用户笔记的 XSS 双保险**：渲染前 `rehype-sanitize` 白名单 + 存储/展示两侧都过一遍；不要只依赖渲染器。
4. **包体积回退检查**：P0-4 后重新对比 chunk 体积；若 QA 页仍需整库检索，确认懒加载时机（首次输入再 fetch 索引）。
5. **内容兼容回归**：22 个内容文件 + 官方文档 + 速查表在新渲染器下逐篇过渲染（可写一个临时脚本对每篇跑渲染并 diff 关键结构）。
6. **`out/` 与 `.next/` 是构建产物**：不手动编辑；验证一律通过重新构建。
7. **CI 删除 `app/api` 的做法**：在 P1-2 决策前保持现状，但注意该步骤对本地构建（不删）与 CI 构建（删）行为不一致，可能掩盖"静态导出下页面引用了已删除路由"的错误——P0-4 改造后重点验证 GH Pages 产物。

---

## 6. 验证清单（每 Phase 完成后过一遍）

- [ ] `npm run lint` 无 error
- [ ] `npm run build`（默认 serverful）成功
- [ ] `STATIC_EXPORT=true npm run build` 成功，`out/` 生成
- [ ] `out/learn/*.html` 含正文文本（P0-2 起）
- [ ] `out/learn/*.html` 含文章级 title/description/JSON-LD（P0-3 起）
- [ ] 含公式文章 KaTeX 正确渲染（P0-1 起）
- [ ] XSS 测试用例（笔记注入 `<script>`/`<img onerror>`）不执行（P0-1 起）
- [ ] 首页首包体积较基线下降（P0-4）
- [ ] 搜索、QA 检索、用户笔记功能行为与改造前一致
- [ ] 双环境（Vercel / GH Pages）URL、sitemap、robots、canonical 正确（P1-1）
- [ ] GH Pages 上 QA / 论文检索状态符合决策（P1-2）
- [ ] Lighthouse 前后对比：文章页 LCP、CLS、SEO 分数提升

---

## 7. 功能迭代记录（学习工具，已完成 2026）

围绕「训练 → 诊断 → 调参」学习闭环新增的独立功能（非优化项）：

| 页面 | 功能 | 实现要点 |
|---|---|---|
| `/lcurve` | **lcurve.out 训练诊断器** | 粘贴/上传 lcurve → SVG 曲线（E/F/V + lr，对数刻度）→ 自动诊断：NaN 发散、损失反弹、收敛性、过拟合、质量分级（力 <0.05/0.1/0.2、能量 <0.01/0.02/0.05）、能量-力失衡、学习率异常；诊断记录存 localStorage。核心逻辑在 `lib/lcurve.ts`（纯函数，Node 可测，15 项测试） |
| `/model-devi` | **model_devi 偏差分析器** | 粘贴 model_devi.out → max_devi_f 随迭代曲线 + f_trust_lo/hi 参考线（阈值可调）→ 诊断：高偏差帧占比分级、偏差趋势、收敛判断。核心逻辑 `lib/model-devi.ts`（12 项测试） |
| `/tutorial` | **从零训练 Cu 势函数** | 端到端最小闭环 8 步（环境/数据/配置/训练/测试/冻结/使用/调参），全部命令一键复制，链到 lcurve 诊断器、配置构建器与相关文章 |
| `/tools` | **学习工具索引** | 汇聚上述工具 + 配置构建器 + SOP + 速查表；导航栏新增「工具」入口（速查表移入工具索引） |

- 图表为无依赖手写 SVG（`components/diag/line-chart.tsx`，支持对数刻度/参考线）。
- 新增 `lib/use-local-storage.ts`（useSyncExternalStore 水合安全的 localStorage 状态，lint 友好），诊断历史与阈值设置均用它。
- 验证：tsc 0 错误、改动文件 lint 0 告警、解析器测试全绿、静态导出 67 页构建成功。
