# 飞书文档调研报告 for FlowMind

> 调研日期：2025 年  
> 调研范围：飞书文档（Lark Docs）编辑器功能 + GitHub 可借鉴开源实现  
> 目标：找出可在 ≤3 天内落地到 FlowMind（Tiptap 2.x + Yjs + Hono + React）的功能

---

## 任务 A：飞书文档功能盘点

### 飞书文档核心架构

飞书文档采用全 Block 设计（与 Notion 同理），每个段落、标题、图片、表格、代码块都是一个独立 Block，支持拖拽重排。Block tree 结构与飞书开放平台 API 完全对应：block_type 用数字编码（文本=2，标题=3-11，列表=12-13，代码=14，引用=34，Callout=19，分栏 Grid=24，图片=27，文件=，链接预览=48 等）。

---

### A1. 编辑器内交互

| 功能 | 飞书里的样子 | 难度 | 备注 |
|------|-------------|------|------|
| **Slash 命令（/菜单）** | 空行输入 `/` 弹出命令面板，含 15+ 块类型，方向键 + 回车选择 | 🟡 Easy | FlowMind 已有，但功能项可扩充 |
| **Block 拖拽手柄** | 鼠标悬停块左侧出现 `⠿` 手柄图标，拖动实现换序；飞书只支持垂直排序，不支持拖到侧边形成分栏 | 🟡 Easy | Tiptap 官方有 `@tiptap/extension-drag-handle`，MIT |
| **悬浮选区工具栏（Bubble Menu）** | 选中文字后顶部浮出工具栏：加粗/斜体/下划线/颜色/链接/评论 | 🟢 Trivial | Tiptap 官方 `BubbleMenu` 免费，FlowMind 只需加样式 |
| **行内 @mention** | 输入 `@` 触发用户/文档建议列表；`@人名` 自动通知对方 | 🟠 Medium | Tiptap `@tiptap/extension-mention`（免费），需后端 API |
| **Emoji Picker（:shortcode:）** | 输入 `:` 触发 emoji 补全，支持 GitHub 风格 shortcode；也可从工具栏插入 | 🟡 Easy | Tiptap `@tiptap/extension-emoji`（免费）含 suggestion |

---

### A2. 块（Block）类型

| Block 类型 | 飞书里的样子 | 难度 | 能抄到什么程度 |
|-----------|-------------|------|--------------|
| **Callout / 高亮块** | 带彩色左边框 + emoji 图标的容器块，6 种颜色（蓝/红/黄/橙/紫/绿），内部可嵌套文本、列表 | 🟡 Easy | 可完整实现：自定义 Tiptap Node + NodeView，用 Tailwind 渲染颜色 |
| **折叠块 / Toggle** | 标题行 + 可折叠内容区，点击箭头展开/收起；飞书里标题下的内容可一键折叠 | 🟡 Easy | Tiptap 官方 `@tiptap/extension-details`（`<details>/<summary>`）MIT 免费 |
| **代码块语法高亮** | 代码块右上角选语言，自动高亮显示，支持 30+ 语言 | 🟢 Trivial | Tiptap `@tiptap/extension-code-block-lowlight` + lowlight（MIT），5 行配置 |
| **表格（行列增删）** | 点击行/列出现 +/x 操作按钮；支持合并单元格；飞书限制 9x9，FlowMind 无需限制 | 🟡 Easy | Tiptap `@tiptap/extension-table`（完全免费 MIT） |
| **分栏 / Grid 布局** | 1-4 列并排布局，每列独立拖入块；适合并排图片或并排文字 | 🟠 Medium | 需自研 Grid + Column 两个 Node，参考 BlockSuite；3-5 天 |
| **链接书签卡片（Link Preview）** | 粘贴 URL 后可转为书签卡片：网站图标 + 标题 + 描述预览（Open Graph） | 🟡 Easy | 需后端抓 OG 数据（1 个 Hono API），前端自定义 Node |
| **文件附件块** | 插入本地文件作为块，显示文件名 + 大小 + 下载按钮 | 🟡 Easy | 复用 FlowMind 已有的图片上传逻辑，改为通用文件类型 |
| **内嵌视频块** | 插入 YouTube / 哔哩哔哩 URL 直接渲染播放器 iframe | 🟢 Trivial | Tiptap `@tiptap/extension-youtube`（MIT 免费）；B站需手写 |
| **数学公式块** | 独立数学公式行，支持 LaTeX 语法，`$$` 触发 | 🟡 Easy | Tiptap `@tiptap/extension-mathematics`（免费），依赖 KaTeX |

---

### A3. 协作体验

| 功能 | 飞书里的样子 | 难度 | 说明 |
|------|-------------|------|------|
| **协作者光标 + 头像** | 其他用户光标实时显示带颜色名字标签 | 🟠 Medium | Tiptap `CollaborationCaret`（MIT 免费），已规划，开源加速见下 |
| **行内评论锚点** | 选中文字 → 评论图标，评论气泡显示在右侧；评论解决后锚点消失 | 🔴 Hard | 已规划，跳过 |
| **文档权限粒度** | 可编辑/可评论/仅查看三级；飞书还有"禁止下载/复制" | 🟠 Medium | FlowMind 已有 readonly/collab，扩展 Comment 级需改 JWT payload |

---

### A4. 导航与目录

| 功能 | 飞书里的样子 | 难度 | 说明 |
|------|-------------|------|------|
| **自动生成 TOC / 大纲面板** | 文档左侧根据 H1-H9 自动生成目录树，点击跳转；标题更新时实时同步 | 🟡 Easy | Tiptap `@tiptap/extension-table-of-contents`（免费）+ 自写侧边栏 React 组件 |
| **标题锚点跳转** | 每个标题有 `#anchor` 链接，分享后可定位到具体标题 | 🟢 Trivial | `@tiptap/extension-unique-id` + 给 Heading 加 `id` attr，URL hash 跳转 |
| **面包屑** | 飞书知识库的面包屑导航（`空间 > 文档集 > 当前文档`） | 🔴 Hard | 需要完整知识库树结构，已规划文件夹时一并做 |

---

### A5. 小而好用的 UX 细节

| 功能 | 飞书里的样子 | 难度 | 说明 |
|------|-------------|------|------|
| **字数/字符统计** | 状态栏显示字数统计（可选字符数/单词数） | 🟢 Trivial | Tiptap `@tiptap/extension-character-count`（MIT 免费），1 行代码 |
| **文档信息侧栏** | 顶部显示"最近修改时间/修改者"；可折叠 | 🟢 Trivial | 前端从 drizzle 查 `updated_at` + user，展示在 header |
| **Markdown 快捷输入** | 输入 `## ` 自动转标题，`- ` 自动转列表，`> ` 自动转引用，`\`\`\` ` 自动转代码块 | 🟢 Trivial | Tiptap StarterKit 已内置 InputRules，开箱即用 |
| **Typography 自动替换** | `--` → `—`，`(c)` → `©`，`...` → `…`，直引号 → 弯引号 | 🟢 Trivial | Tiptap `@tiptap/extension-typography`（MIT 免费）|
| **悬浮行添加按钮（+ 号）** | 每行左侧 hover 出现 `+` 按钮，点击插入新块或唤起 /菜单 | 🟡 Easy | FloatingMenu + 自定义 React 组件，可与 DragHandle 结合做成飞书式左侧手柄 |
| **代码块复制按钮** | 代码块右上角"复制代码"按钮，hover 显示 | 🟢 Trivial | Tiptap CodeBlock NodeView 加一个 button，`navigator.clipboard.writeText` |

---

## 任务 B：开源参考实现

### B1. Tiptap 官方（全部 MIT 免费除非特别注明）

| 功能 | 包名 | 许可 | 直接可用文件/用法 |
|------|------|------|-----------------|
| 代码高亮 | `@tiptap/extension-code-block-lowlight` | MIT | 直接替换 StarterKit 的 CodeBlock，传入 `lowlight` 实例 |
| 折叠块 | `@tiptap/extension-details` + `DetailsContent` + `DetailsSummary` | MIT | `npm i @tiptap/extension-details`，三个 Extension 一起加 |
| TOC 大纲 | `@tiptap/extension-table-of-contents` | MIT | `onUpdate` 回调传给侧边 React 组件 |
| 拖拽手柄 | `@tiptap/extension-drag-handle` + `@tiptap/extension-drag-handle-react` | MIT | DragHandle.configure({ render: () => div }) |
| 表格 | `@tiptap/extension-table` / `TableKit` | MIT | 完整行列增删，支持 resizable columns |
| 字数统计 | `@tiptap/extension-character-count` | MIT | `editor.storage.characterCount.words()` |
| Emoji | `@tiptap/extension-emoji` | MIT | 内置 Unicode 14.1 全集 + GitHub emoji，suggestion 驱动 |
| Typography | `@tiptap/extension-typography` | MIT | 自动引号、破折号等 |
| 唯一 ID | `@tiptap/extension-unique-id` | MIT | 给每个节点自动加 `id`，用于锚点跳转 |
| YouTube 嵌入 | `@tiptap/extension-youtube` | MIT | `editor.commands.setYoutubeVideo({ src })` |
| 数学公式 | `@tiptap/extension-mathematics` | MIT | 依赖 KaTeX，`$$` 和 `$` 触发 |
| Mention | `@tiptap/extension-mention` | MIT | 自定义 suggestion 数据源 + Tippy 渲染 |

> **注**：`CollaborationCaret`（协作光标）也是免费的，见 `@tiptap/extension-collaboration-caret`（v2.x）/ `@tiptap/extension-collaboration` 包内的 Caret 功能（v3.x 重命名为 `CollaborationCaret`）。

---

### B2. 小型专用开源库

| 库 | Stars | License | 直接可用之处 | Tiptap 2.x 兼容性 |
|----|-------|---------|------------|-----------------|
| [tiptap-extension-global-drag-handle](https://github.com/NiclasDev63/tiptap-extension-global-drag-handle) | 149 ⭐ | MIT | 全局拖拽手柄，`npm install tiptap-extension-global-drag-handle`，无需 CSS 框架 | ✅ 完全兼容，纯 ProseMirror Plugin |
| [@harshtalks/slash-tiptap](https://github.com/harshtalks/tiptap-plugins) | ~200 ⭐ | MIT | Notion 风格 slash command，基于 `@tiptap/suggestion` + `cmdk`，TypeSafe | ✅ 兼容，React 专用 |
| [tiptap-markdown](https://github.com/aguingand/tiptap-markdown) | ~600 ⭐ | MIT | Markdown 双向转换扩展，`editor.storage.markdown.getMarkdown()` | ✅ 兼容 |
| [novel](https://github.com/steven-tey/novel) | 15.5k ⭐ | Apache-2.0 | slash 命令实现在 `packages/novel/src/ui/editor/plugins/slash-command.tsx`，callout 在同目录的 generative-menus | ⚠️ Apache-2.0，商用需保留版权；Next.js 绑定，核心逻辑可移植 |

---

### B3. 类飞书开源编辑器参考

| 项目 | Stars | License | 最佳借鉴点 |
|------|-------|---------|-----------|
| [BlockSuite](https://github.com/toeverything/blocksuite) | ~5k ⭐ | MPL-2.0 | AFFiNE 的底层编辑器；Grid/分栏 Node 实现、Block 拖拽跨列的思路可参考，但与 Tiptap 不同栈，只看设计 |
| [Outline](https://github.com/outline/outline) | ~30k ⭐ | BSL 1.1 | BSL（非商用免费）；其 `app/editor/extensions/` 目录有丰富的 ProseMirror extension；尤其是 `SmartText`、`PasteHandler`、`Placeholder` 风格 |
| [Huly](https://github.com/hcengineering/huly-code) / [Tiptap Notion Template](https://templates.tiptap.dev) | - | - | Tiptap 官方有 Notion 风格模板（免费账号可看源码，但不可商用），drag handle + slash + callout 一套完整实现 |

---

## 任务 C：综合推荐 — 最值得立刻做的 5 个功能

---

### 功能 1: Callout / 高亮块

- **飞书里长什么样**：带彩色左边框（蓝/黄/红/绿/橙/紫）和可选 emoji 图标的容器块，内部可嵌套段落和列表，是文档中"提示/警告/注意"的标准表达。
- **难度**：🟡 Easy（约 1 天）
- **抄哪里**：自写，参考 [feishu-cli callout 规范](https://explainx.ai/skills/riba2534/feishu-cli/feishu-cli-doc-guide)（6 种颜色映射）+ [longbridgeapp/feishu-pages 的 Tailwind CSS 实现](https://longbridgeapp.github.io/feishu-pages/zh-CN/feishu-docx)
- **在 FlowMind 怎么落地**：在 `src/extensions/` 新建 `Callout.ts`，用 `Node.create()` 定义 callout 节点（`group: 'block'`，`content: 'block+'`，`attrs: { color, emoji }`），用 `ReactNodeViewRenderer` 渲染带 Tailwind 颜色类的容器组件。在 slash 命令的 `items` 数组中加入 6 种 callout 变体，更新 `SlashMenuComponent.tsx`。
- **用户感知价值**：写文档时最常见的信息强调方式，能立刻让 FlowMind 文档"看起来专业"。

---

### 功能 2: 折叠块 / Toggle（Details）

- **飞书里长什么样**：一行摘要 + 可折叠内容区；点击左侧箭头展开/收起；适合长文档隐藏次要内容，也是 FAQ 文档的标配。
- **难度**：🟢 Trivial（约 2-4 小时）
- **抄哪里**：[`@tiptap/extension-details`](https://tiptap.dev/docs/editor/extensions/nodes/details) — MIT，官方维护，`npm install @tiptap/extension-details`
- **在 FlowMind 怎么落地**：`npm install @tiptap/extension-details @tiptap/extension-details-content @tiptap/extension-details-summary`，在 `editor.ts`（或 useEditor hook 所在文件）的 `extensions` 数组加入三个包，在 slash 命令加入 `/toggle` 入口。加 3 行 CSS 处理 `<details>` 的展开箭头动画。
- **用户感知价值**：长文档的折叠能力，极大改善阅读体验，几乎零实现成本。

---

### 功能 3: 代码块语法高亮

- **飞书里长什么样**：代码块右上角下拉选择语言（JavaScript / Python / Go / SQL 等 30+ 种），代码区域自动上色高亮，还有复制按钮。
- **难度**：🟢 Trivial（2-3 小时）
- **抄哪里**：[`@tiptap/extension-code-block-lowlight`](https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight) — MIT，官方，依赖 `lowlight`（本身依赖 `highlight.js`）
- **在 FlowMind 怎么落地**：`npm install @tiptap/extension-code-block-lowlight lowlight`，替换 StarterKit 中的默认 CodeBlock（`StarterKit.configure({ codeBlock: false })`），在 NodeView 里加一个语言选择 `<select>` 和复制按钮。`lowlight.registerLanguage()` 按需注册语言包减小 bundle size。
- **用户感知价值**：开发者最核心需求，FlowMind 现有代码块没有高亮，这是高频痛点。

---

### 功能 4: 自动生成 TOC / 文档大纲面板

- **飞书里长什么样**：文档左侧常驻面板，自动提取所有 H1-H9 标题生成目录树，点击跳转到对应位置；标题增删时实时更新；大纲按层级缩进。
- **难度**：🟡 Easy（约 1 天）
- **抄哪里**：[`@tiptap/extension-table-of-contents`](https://tiptap.dev/docs/editor/extensions/functionality/table-of-contents) — MIT，官方免费
- **在 FlowMind 怎么落地**：`npm install @tiptap/extension-table-of-contents`，在 `useEditor` 配置 `onUpdate(anchors)` 将锚点数组存入 Zustand store；新建 `TableOfContents.tsx` React 组件读取 store 渲染侧边栏目录，用 `anchor.id` 做 `document.getElementById(id).scrollIntoView()` 跳转。搭配 `@tiptap/extension-unique-id` 确保每个标题有稳定的 `id`。
- **用户感知价值**：长文档导航神器，是飞书文档标志性体验之一，用户写超过 10 个标题的文档必需。

---

### 功能 5: Block 拖拽手柄（Drag Handle）

- **飞书里长什么样**：鼠标悬停到任意块时，块左侧出现 `⠿` 拖拽图标，按住可将整块拖到文档任意位置重排；图标同时有菜单（删除/复制/转换类型等选项）。
- **难度**：🟡 Easy（约 1 天）
- **抄哪里**：官方 [`@tiptap/extension-drag-handle`](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle) — MIT；或社区 [`tiptap-extension-global-drag-handle`](https://github.com/NiclasDev63/tiptap-extension-global-drag-handle)（MIT，149⭐，1,453 被使用）
- **在 FlowMind 怎么落地**：推荐先用 `tiptap-extension-global-drag-handle`（零依赖，更轻）：`npm install tiptap-extension-global-drag-handle`，加入 extensions 数组，`.drag-handle` CSS 类配置样式（Tailwind `fixed opacity-0 hover:opacity-100 cursor-grab`）。后续若需要"点击手柄弹菜单"，可用 `DragHandle.configure({ onNodeChange })` 注入 Zustand 触发 React 弹窗。
- **用户感知价值**：结构调整从"剪切粘贴"变成"拖一下"，是区分普通编辑器和 Notion/飞书的直观差异。

---

## 已规划项的开源加速

> 以下是你已列入规划但有特别好的开源实现的条目，能显著降低工作量：

| 已规划功能 | 推荐开源实现 | 节省工作量原因 |
|-----------|------------|--------------|
| **协作者光标头像** | `@tiptap/extension-collaboration-caret`（v2.x MIT 免费）：配置 `user: { name, color }` 即可；v3 改名 `CollaborationCaret` | 官方维护，直接与已有 Yjs y-websocket 集成，加 3 行代码，0.5 天 |
| **@mention** | `@tiptap/extension-mention`（MIT）+ 自定义后端接口；novel 的 `slash-command.tsx` 里 mention 实现可直接借鉴 UI | 官方 extension 已处理所有 keyboard navigation 和 suggestion popup，只需写数据接口 |
| **DOCX 导出** | `@tiptap/extension-export`（付费 Start 计划）或开源 [ProseMirror docx](https://github.com/ProseMirror/prosemirror-docx)；也可后端用 `docx` npm 包手动映射 | 官方路线付费，但 `docx` 包可自写 mapper 处理 90% 场景 |
| **版本历史** | `@tiptap/extension-snapshot`（官方免费）提供手动快照；结合 SQLite 存 Yjs 的 `Y.encodeStateAsUpdate()` 二进制可做完整版本树 | SQLite 方案和 drizzle 完全兼容，无额外依赖，1 列存 blob 即可 |

---

## 接下来 1 周的执行顺序

```
Day 1（上午）: 代码块语法高亮
  → npm install @tiptap/extension-code-block-lowlight lowlight
  → 替换 StarterKit CodeBlock，加语言选择器 + 复制按钮
  → 最快出效果，立刻有用户感知价值

Day 1（下午）: 折叠块 Toggle
  → npm install @tiptap/extension-details ...
  → slash 命令加 /toggle 入口
  → 半天搞定

Day 2（全天）: Callout 高亮块
  → 自定义 Callout Node + NodeView（最有飞书质感的功能）
  → 6 种颜色 + emoji icon + slash 命令支持
  → 同时写好 Tailwind 样式和 dark mode

Day 3（全天）: TOC / 文档大纲面板
  → @tiptap/extension-table-of-contents + @tiptap/extension-unique-id
  → 新建侧边栏 React 组件 + Zustand 状态
  → 处理 scroll spy（active 标题高亮）

Day 4（全天）: Block 拖拽手柄
  → tiptap-extension-global-drag-handle（快速版）
  → 或官方 @tiptap/extension-drag-handle（配合 floating-ui 精细定位）
  → 最后做，因为与其他 extension 交互最多，放最后风险最小

Day 5（可选，弹性）: 表格增强
  → @tiptap/extension-table（TableKit）
  → 替换 Starter 默认表格，加行列操作 UI
  → 或改做 Typography + 字数统计（各 < 1 小时，填坑用）
```

**一句话总结**：代码高亮 → Toggle → Callout → TOC → 拖拽。前三个"感知即时"，用户写一篇文档就能感受到；后两个"效率跃升"，让 FlowMind 从富文本编辑器晋升为文档工具。

---

## 附录：飞书文档完整 Block 类型速查

| block_type | 名称 | FlowMind 状态 |
|-----------|------|--------------|
| 2 | 文本段落 | ✅ 已有 |
| 3-11 | 标题 H1-H9 | ✅ 已有（H1/H2） |
| 12 | 无序列表 | ✅ 已有 |
| 13 | 有序列表 | ✅ 已有 |
| 14 | 代码块 | ✅ 已有（无高亮） |
| 15 | 引用 | ✅ 已有 |
| 16 | 数学公式块 | ❌ 未做 |
| 17 | Todo 任务 | ✅ 已有 |
| 19 | **Callout 高亮块** | ❌ 推荐做 |
| 21 | 图表（Diagram/Board） | ✅ 已有（XYFlow） |
| 22 | 分隔线 | ✅ 已有 |
| 24 | Grid 分栏 | ❌ 中等难度 |
| 27 | 图片 | ✅ 已有 |
| 28 | **折叠块 Toggle** | ❌ 推荐做 |
| 31 | 表格 | ❌（StarterKit 有基础版） |
| 34 | 引用容器 | ✅ 已有（Blockquote） |
| 43 | 白板/流程图 | ✅ 已有 |
| 48 | **链接预览卡片** | ❌ 推荐后续做 |
| - | **文件附件** | ❌ 推荐后续做 |
