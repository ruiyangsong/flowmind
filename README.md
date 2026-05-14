# MindForge (formerly FlowMind)

> 一体化思维工作台 — 一个 Markdown 文档，三种视图：**Markdown / 脑图 / 流程图**，同源 AST，零信息损失。键盘优先，本地优先，自托管。

![status](https://img.shields.io/badge/status-v0.3-2563eb) ![runtime](https://img.shields.io/badge/runtime-node%2020%20%2B%20sqlite-blue) ![stack](https://img.shields.io/badge/stack-CodeMirror%206%20%2B%20xyflow-purple)

## v0.3 — MindForge 重写说明

v0.3 起前端完全重写，富文本编辑器从 Tiptap 切换为 **CodeMirror 6 + 同源 AST**：

- **三视图同源**：`Document.content` 就是 plain Markdown。`markdownToAst()` / `astToMarkdown()` 双向转换，脱错零担忧。
- **Markdown 视图**: CodeMirror 6 · 行号 / 折叠 / 语法高亮 / KaTeX。
- **脑图视图**: ReactFlow (xyflow v12) + dagre · LR 布局 · Tab/Enter/F2/Del 键盘交互。
- **流程图视图**: 有序列表 (`1.`) 自动识别为流程，`判断：` 前缀生成菱形。
- **命令面板**: ⌘K / `/` 触发，fuzzy 搜文档 + 命令 + 视图切换。
- **暗黑模式**: light / dark / auto 三态 · CSS 变量驱动。
- **本地优先**: IndexedDB (Dexie) 500ms 本地 · 2s 后端同步。

后端（Hono + better-sqlite3 + JWT + WebSocket）完全保留不动，API 兼容 v0.2。

### 键盘表

| Key       | Action                  |
|-----------|-------------------------|
| ⌘K        | Command palette         |
| ⌘1/2/3   | Markdown / Mind / Flow  |
| ⌘\\       | Toggle split view       |
| ⌘N        | New document (HomePage) |
| Tab       | Add child (Mind)        |
| Enter     | Add sibling (Mind)      |
| F2 / Space| Rename node (Mind)      |
| Del       | Remove node (Mind)      |

---

---

## Quick start — one command

```bash
docker run -d --name flowmind -p 3000:3000 -v flowmind-data:/data ghcr.io/ruiyangsong/flowmind:latest
```

Open <http://localhost:3000>, register an account, start writing. Data lives in the `flowmind-data` volume and survives container restarts.

> Building locally instead of pulling? See **[Build from source](#build-from-source)**.

### Or with docker compose

```yaml
# docker-compose.yml
services:
  flowmind:
    image: flowmind:latest
    ports: ["3000:3000"]
    volumes: ["flowmind-data:/data"]
    restart: unless-stopped
volumes:
  flowmind-data:
```

```bash
docker compose up -d
```

---

## What you get

| Feature | Notes |
| --- | --- |
| **Rich text editor** | Tiptap + StarterKit + task lists + slash menu |
| **Embedded diagrams** | Mind maps & flowcharts (xyflow), live-editable inside the doc |
| **Real-time collab** | Yjs CRDT over WebSocket, sharable `/collab/<token>` links |
| **Read-only sharing** | Public `/share/<token>` links with optional expiry |
| **Offline-first** | IndexedDB cache (Dexie) — keep typing without a connection |
| **Save status indicator** | `Saved · Saving… · Offline · Unsynced` in the editor header |
| **Export** | PDF via browser print dialog · Markdown download (`.md`) |
| **Single-binary deploy** | Hono serves both API and frontend on one port; WS attached to same socket |
| **Zero-config auth** | JWT secret auto-generated on first boot; scrypt-hashed passwords |
| **Tiny first paint** | ~56 KB gzip first-load JS (editor/diagram chunks lazy-loaded) |

---

## Configuration

All env vars are **optional**.

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Bind port for HTTP + WebSocket |
| `DB_PATH` | `/data/flowmind.db` (prod) · `./data/flowmind.db` (dev) | SQLite file location |
| `JWT_SECRET` | auto-generated → `${DATA_DIR}/.jwt_secret` | Override only if you need a fixed key (e.g. multi-host) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime — accepts `7d` or `3600s` |
| `FRONTEND_URL` | `""` (relative URLs) | Override only when serving share links from a different host than the API |

Copy `.env.example` to `.env` for local dev.

---

## Build from source

```bash
git clone https://github.com/ruiyangsong/flowmind.git
cd flowmind

# Local dev (Vite + tsx on two ports, with proxy)
pnpm install
pnpm dev
# → frontend http://localhost:5173  ·  api+ws http://localhost:3000

# Production build (single container)
docker build -t flowmind:latest .
docker run -d -p 3000:3000 -v flowmind-data:/data flowmind:latest
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    flowmind  (port 3000)                 │
│                                                          │
│   GET  /              → frontend/dist/index.html         │
│   GET  /assets/*      → static files                     │
│   *    /auth/*        → Hono router  (register/login/me) │
│   *    /documents/*   → Hono router  (CRUD)              │
│   *    /share/*       → Hono router  (tokens, resolve)   │
│   UPGRADE /ws/<token> → y-websocket (Yjs CRDT)           │
│                                                          │
│   storage:  /data/flowmind.db   (SQLite, WAL)            │
│             /data/.jwt_secret   (auto-generated)         │
└──────────────────────────────────────────────────────────┘
```

- **Backend**: Hono 4 · better-sqlite3 · drizzle-orm · jose JWT · ws/y-websocket
- **Frontend**: React 18 · Vite · Tiptap · xyflow · Dexie · Zustand · TailwindCSS
- **Storage**: SQLite (single file, WAL mode). No external services.

---

## Migrating from the pre-0.2 layout

If you cloned an earlier copy with `apps/server` + `apps/web` + `packages/shared`:

1. **Server**: the API moved from `apps/server/src/` to `backend/src/`. Routes & schema are unchanged.
2. **Client**: the SPA moved from `apps/web/src/` to `frontend/src/`. Duplicate pages (`Home.tsx` + `HomePage.tsx`, two auth stores, etc.) have been collapsed into one canonical version.
3. **Ports**: previously `3001` (HTTP) + `3002` (WS). Now a single `3000`. The WS endpoint moved from `ws://host:3002/<token>` to `ws://host:3000/ws/<token>`.
4. **DB schema is identical** — drop your old `flowmind.db` into `/data` and it just works.
5. **Passwords**: pre-0.2 used unsalted sha256. Existing users will need to re-register. If you have a populated database and care about migration, run a one-off SQL `DELETE FROM users` and let them sign up again — sessions auto-recover from `/auth/me`.

---

## Roadmap

See [docs/PRD.md](./docs/PRD.md) for product definition & design principles, and [docs/ROADMAP.md](./docs/ROADMAP.md) for the prioritised iteration list.

Next milestones at a glance:

- **v0.3** — More diagram blocks (Mermaid, Excalidraw, Kanban) + template library
- **v0.4** — AI features (`/ai` slash command, selection → mind map, multi-provider)
- **v0.5** — Folders / tags, full-text search, version history
- **v0.6** — Attachments, DOCX export, scheduled backups

---

## License

MIT — see [LICENSE](./LICENSE).
