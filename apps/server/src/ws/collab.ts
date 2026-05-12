/**
 * Yjs WebSocket collaboration server
 *
 * Uses y-websocket's built-in setupWSConnection which handles:
 *   - CRDT sync between connected clients
 *   - Awareness (cursors, presence)
 *   - Persistence of Yjs state to SQLite via binary snapshots
 */
import { WebSocketServer, WebSocket } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'
import { db } from '../db/index.js'
import { documents, shareTokens } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export function startCollabServer(port: number) {
  const wss = new WebSocketServer({ port })

  wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)

    // URL format: ws://host:port/<token>
    const token = url.pathname.slice(1)  // strip leading '/'

    if (!token) {
      ws.close(4001, 'Missing token')
      return
    }

    // Validate share token
    const shareRow = db.select().from(shareTokens).where(eq(shareTokens.token, token)).get()
    if (!shareRow) {
      ws.close(4003, 'Invalid token')
      return
    }
    if (shareRow.expiresAt && new Date(shareRow.expiresAt) < new Date()) {
      ws.close(4003, 'Token expired')
      return
    }
    if (shareRow.mode !== 'collab') {
      ws.close(4003, 'Token is read-only')
      return
    }

    // Use documentId as the Yjs room name so all collaborators sync the same doc
    const docName = shareRow.documentId

    // setupWSConnection handles all Yjs protocol messages
    setupWSConnection(ws, req, { docName, gc: true })
  })

  wss.on('listening', () => {
    console.log(`[collab] WebSocket server listening on ws://localhost:${port}`)
  })

  return wss
}
