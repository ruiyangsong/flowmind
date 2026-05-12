# 🧠 FlowMind

> All-in-one document editor with **Mind Map**, **Flowchart** & **Markdown** — local-first, real-time collaboration, shareable links.

## Features

- 📝 **Markdown document** with block-level editing (Tiptap)
- 🧠 **Mind Map** — insert & edit inline in document
- 🔀 **Flowchart** — insert & edit inline in document
- 💾 **Local-first** — IndexedDB persistence, works offline
- 🔗 **Share links** — read-only or collaborative editing
- 👥 **Real-time collaboration** — CRDT via Yjs + WebSocket
- 📦 **Export** — JSON / PNG per diagram
- 🗂️ **Workspace** — manage multiple documents

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Document editor | Tiptap v2 |
| Mind map / Flowchart | ReactFlow + custom layout |
| Real-time CRDT | Yjs + y-websocket |
| Local persistence | Dexie.js (IndexedDB) |
| Backend | Hono + Node.js |
| Database | SQLite + Drizzle ORM |
| Auth | JWT (stateless) |

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8 (recommended) or npm

### Install & Run

```bash
# Clone
git clone https://github.com/ruiyangsong/flowmind.git
cd flowmind

# Install all dependencies
pnpm install

# Dev mode (frontend + backend + websocket all in one)
pnpm dev

# Production build
pnpm build
pnpm start
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp apps/server/.env.example apps/server/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP API server port |
| `WS_PORT` | `3002` | WebSocket collaboration port |
| `JWT_SECRET` | — | **Required.** Random secret for JWT signing |
| `DB_PATH` | `./data/flowmind.db` | SQLite database file path |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

## Project Structure

```
flowmind/
├── apps/
│   ├── web/          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── editor/       # Tiptap document editor
│   │   │   │   ├── mindmap/      # Mind map canvas
│   │   │   │   ├── flowchart/    # Flowchart canvas
│   │   │   │   └── ui/           # Shared UI components
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx      # Workspace / document list
│   │   │   │   ├── Editor.tsx    # Main editor page
│   │   │   │   ├── Share.tsx     # Read-only share view
│   │   │   │   └── Templates.tsx # Template library
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── lib/
│   └── server/       # Hono backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── documents.ts
│       │   │   └── share.ts
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   └── index.ts
│       │   ├── ws/
│       │   │   └── collab.ts     # y-websocket server
│       │   └── index.ts
│       └── .env.example
├── packages/
│   └── shared/       # Shared types & utils
│       └── src/
│           └── types.ts
└── pnpm-workspace.yaml
```

## Collaboration Architecture

```
Browser A ──┐
            ├──> WebSocket (port 3002) ──> Yjs document ──> SQLite snapshot
Browser B ──┘

Share link: /share/:token  (read-only JWT)
Collab link: /collab/:token (edit JWT, max 10 concurrent)
```

## License

MIT
