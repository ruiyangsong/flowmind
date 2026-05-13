# FlowMind — Product Requirements Document

> **版本**: v0.2 (current)
> **最后更新**: 2026-05-14
> **维护**: ruiyangsong
> **范围**: 描述 FlowMind 的产品定位、当前已交付能力、设计原则、以及后续迭代方向的纲领。具体迭代项见 [ROADMAP.md](./ROADMAP.md)。

---

## 1. 产品定位

FlowMind 是一个**为独立创作者与个人知识工作者**设计的、自部署的"文档 + 图表"工作台。

它的核心主张是：**一份文档既能写字，又能内嵌可交互的思维导图与流程图，并且数据完全归你所有。**

### 1.1 一句话定位

> 一个 docker run 就能跑起来的、笔记 + 思维导图 + 流程图三合一的个人知识库。

### 1.2 目标用户（Primary Persona）

**"独立思考者 Alex"**

- 35 岁，工程师 / 设计师 / 研究员 / 创业者
- 写作时既需要长文本（笔记、博客草稿、产品想法），也需要结构化梳理（脑图、流程图、决策树）
- 对**数据所有权**敏感：不愿把所有笔记交给 Notion 这种 SaaS
- 有基本的 Docker / 服务器使用能力，但不想花一个周末折腾部署
- 对工具的"开箱即用程度"零容忍——读到 README 里出现 "configure these 8 env vars first" 就关掉了

### 1.3 次要用户（Secondary Persona）

**"小团队 Beth"**: 2–5 人的设计 / 研究小组，偶尔需要实时协作、分享只读链接给客户。FlowMind 通过 share token 满足这部分场景，但**不**优化为正式的多租户 SaaS。

### 1.4 不是什么（Non-Goals）

- ❌ **不是 Notion 替代品**：不做数据库、不做关系视图、不做 workspace 级 ACL
- ❌ **不是 Miro 替代品**：图表块定位于"嵌在文档里的思考辅助"，不做大尺寸无限画布协作
- ❌ **不是企业 SaaS**：不做计费、不做 SSO、不做团队管理后台
- ❌ **不锁定用户**：导出永远是一等公民，迁出 FlowMind 不应该是惩罚

---

## 2. 设计原则

这些原则在做任何取舍时**优先于功能数量**。

| # | 原则 | 含义 |
| --- | --- | --- |
| 1 | **零配置启动** | `docker run` 一行命令完整可用，0 个 required env var |
| 2 | **单容器，单卷** | 一个 image、一个 `/data` volume，没有外部依赖（无 Redis / 无 Postgres） |
| 3 | **本地优先** | 离线可写、IndexedDB 缓存、保存状态对用户透明 |
| 4 | **导出即逃生通道** | 用户随时能把数据带走（Markdown / PDF 是 v0.2 已有，DOCX / 整库导出在 roadmap） |
| 5 | **首屏轻** | 首次加载 JS < 200KB gzip，重模块（编辑器、图表、协作）按需加载 |
| 6 | **可读的代码** | 倾向于纯函数 + 标准库，避免引入"看起来很爽但说不清楚为什么需要"的依赖 |

---

## 3. 已交付能力 (v0.2)

### 3.1 文档编辑

| 能力 | 实现 | 备注 |
| --- | --- | --- |
| 富文本编辑 | Tiptap + StarterKit | 标题、粗体、斜体、列表、引用、代码块、分隔线、删除线 |
| 任务列表 | Tiptap task-list / task-item | 嵌套 checkbox |
| Slash 菜单 | 自实现 SlashMenu | `/` 触发，快速插入块级元素 |
| 占位符 | extension-placeholder | 空编辑器引导 "Start writing, or type / to insert…" |
| 标题独立编辑 | EditorPage `<input>` | title 与 content 分离保存 |

### 3.2 嵌入式图表

| 能力 | 实现 | 备注 |
| --- | --- | --- |
| Mind Map 块 | xyflow + 自定义 DiagramExtension | 节点拖拽、连线、添加 / 删除节点 |
| Flowchart 块 | xyflow + 节点类型化（start / process / decision / end） | 4 种节点形状 |
| 图表内嵌于文档 | Tiptap atom node + ReactNodeViewRenderer | 与正文同流式排版，可拖拽、可复制、可删除 |
| 图表数据持久化 | 序列化为 JSON 存入 `documents.content` | 与文档一同保存 |

### 3.3 协作与分享

| 能力 | 实现 | 备注 |
| --- | --- | --- |
| 实时协作 | Yjs CRDT over WebSocket | `/ws/<token>` 与主 HTTP 服务同端口 |
| 协作 share link | `/collab/<token>` | 任何持有 token 的人可加入编辑 |
| 只读 share link | `/share/<token>` | 公开预览，不需登录 |
| 链接过期 | `expiresIn` 参数 | 默认 30d，支持 `"never"` |
| 链接吊销 | DELETE `/share/token/:token` | 立即失效 |

### 3.4 离线与同步

| 能力 | 实现 | 备注 |
| --- | --- | --- |
| 离线写入 | Dexie / IndexedDB | 标记 `synced: false`，下次在线自动重试 |
| 启动时本地优先 | `getLocalDoc` 立即渲染，远端结果到达后 reconcile | 减少首屏白屏感 |
| 保存状态指示器 | `useSaveStatus` zustand store | 4 态：`Saved · Saving… · Offline · Unsynced` + 相对时间 |
| 在线 / 离线事件 | `window.online / offline` 自动切换状态 | 浏览器原生事件驱动 |

### 3.5 导出

| 格式 | 实现 | 体积代价 |
| --- | --- | --- |
| PDF | `editor.getHTML()` → 新窗口 + 内嵌打印 CSS + `window.print()` | 0 KB（零依赖） |
| Markdown | 自实现 Tiptap JSON → Markdown 转换器（覆盖 starter-kit + task list + diagram block） | 0 KB（零依赖） |

### 3.6 认证与账户

| 能力 | 实现 | 备注 |
| --- | --- | --- |
| 邮箱 + 密码注册 / 登录 | Hono + zod + jose JWT | 7 天有效期，可配 |
| 密码强度校验 | 至少 8 字符 + 含字母 + 含数字 | zod refine |
| 密码存储 | scrypt + 16 字节随机盐 | 替代 v0.1 的不加盐 sha256 |
| 标准化错误格式 | `{ ok: false, error: { code, message } }` | code 机器可读 |
| JWT 密钥自动生成 | 首次启动写入 `${DATA_DIR}/.jwt_secret` (0600 权限) | 用户无需设 env |

### 3.7 部署与运行

| 能力 | 实现 | 备注 |
| --- | --- | --- |
| 单容器部署 | 多阶段 Dockerfile (deps → build → runtime, alpine + tini) | image 体积 ~ 200MB |
| 一行启动 | `docker run -d -p 3000:3000 -v flowmind-data:/data flowmind:latest` | 0 required env |
| docker-compose | 提供 `docker-compose.yml` | 一键 `up -d` |
| 数据持久化 | `/data` volume (SQLite WAL + JWT secret) | 重启 / 升级零数据损失 |
| 健康检查 | HEALTHCHECK 调 `/health` | Docker / k8s 友好 |
| SPA + API + WS 同端口 | Hono `serveStatic` + upgrade 转发到 ws | 反向代理只需配一个 upstream |
| 首屏 bundle | ~ 56 KB gzip（react + router + index） | 编辑器 / 图表 / 协作 lazy load |

### 3.8 数据模型

- **users**: `id, email, name, password, avatar_url, created_at`
- **documents**: `id, title, content(JSON), owner_id, is_public, created_at, updated_at`
- **share_tokens**: `token, document_id, mode(readonly/collab), created_by, expires_at, created_at`

存储引擎：SQLite (WAL mode, foreign_keys on, synchronous NORMAL)。

### 3.9 API 概览

| 路由 | 描述 |
| --- | --- |
| `POST /auth/register` `/auth/login` `GET /auth/me` | 账户 |
| `GET /documents`, `POST /documents`, `GET/PATCH/DELETE /documents/:id` | 文档 CRUD |
| `POST /share/:docId`, `GET /share/:docId`, `DELETE /share/token/:token`, `GET /share/resolve/:token` | 分享链接 |
| `WS /ws/:token` | Yjs 协作通道 |
| `GET /health` | 健康检查 |

---

## 4. 已知限制

记录是为了将来 prioritize，**不是**承诺一定要修。

| 限制 | 影响 | 优先级 |
| --- | --- | --- |
| 没有多 workspace 概念 | 一个账号下所有文档平铺 | 中 |
| 没有文件夹 / 标签 | 文档多了之后难管理 | **高** |
| 没有全文搜索 | 文档数 > 50 后开始疼 | **高** |
| 没有版本历史 | 误操作 / 误删无法恢复（除非 IndexedDB 还有缓存） | 中 |
| 没有附件上传 | 不能贴图、不能贴文件 | **高** |
| 没有 AI 能力 | 与现代工具相比缺一档 | **高** |
| 仅 mind map + flowchart | Mermaid / Excalidraw / Kanban 视图缺失 | **高** |
| 单实例 | 多节点部署需自行做 SQLite 同步（建议加 Postgres adapter） | 低 |
| 没有 SSO / OAuth | 个人用户够用，团队场景受限 | 低 |
| Yjs state 不落盘 | 协作 session 关闭后增量丢失，依赖 debounced REST save | 中 |

---

## 5. 后续迭代纲领

迭代分两条主线，详见 [ROADMAP.md](./ROADMAP.md)：

### 主线 A：**让画图更强大**（v0.3 主题）

为什么先做这条：FlowMind 现有差异化点就是"文档里能画图"。先把这个优势打透，比追平别人有的东西更重要。

候选方向：Mermaid 块、Excalidraw 风手绘块、Kanban 视图块、白板模式、模板库。

### 主线 B：**让写作更智能**（v0.4 主题）

为什么紧随其后：AI 能力已经是 2026 年个人知识工作的基线期望。但要做就做有特点的——不是简单接个 LLM 在侧边对话，而是与"图 + 文"的核心定位结合。

候选方向：选中文本 → 生成大纲 → 一键转 Mind Map、`/ai` slash 命令、文档总结、AI 续写、多 provider（OpenAI / Anthropic / 本地 Ollama）。

### 后续主线（v0.5+）

- 文件夹 / 标签 / 全文搜索（让多文档可用）
- 版本历史（写作安全感）
- 附件上传（贴图必备）
- DOCX 导出、整库导出（数据所有权强化）
- 备份 / 恢复 cron + S3 适配

---

## 6. 不在路线图上的事

为了让定位清晰，明确**不做**：

- 多租户 SaaS 计费 / 团队管理后台
- 移动端原生 app（PWA 优先）
- 桌面 Electron 包装（容器版已够轻）
- 强企业能力：SSO / SCIM / 审计日志 / RBAC 矩阵
- 数据库内置全文检索之外的"AI 检索"（embedding / RAG）—— 留给社区集成

---

## 7. 度量与成功标准

| 类别 | 指标 | 目标 |
| --- | --- | --- |
| 部署摩擦 | `docker run` 到第一次写下文字的时间 | < 60 秒 |
| 首屏性能 | first JS gzip size | < 100 KB |
| 资源占用 | 空载内存 (idle, 0 docs) | < 200 MB RSS |
| 可靠性 | 重启后数据完整性 | 100%（已通过 v0.2 烟测） |
| 用户感知 | 保存延迟（编辑停顿 → "Saved"） | < 1.2s |
| 代码可维护性 | 后端文件数 | < 30（v0.2: 9） |

---

## 8. 变更记录

| 版本 | 日期 | 关键变化 |
| --- | --- | --- |
| v0.2 | 2026-05-14 | 单容器化、扁平 workspace、scrypt 密码、保存状态、PDF/Markdown 导出、bundle 拆包、JWT 自动生成 |
| v0.1 | 2026-05-13 | 首个 push：双进程、apps/server + apps/web + packages/shared、sha256 密码 |

---

_本 PRD 是活文档。每次 minor 版本（v0.x）发布时一并更新此文件与 ROADMAP。_
