/**
 * Yjs WebSocket collaboration — attached to the main HTTP server.
 *
 * URL format:  ws(s)://host/ws/<share_token>
 *
 * Validates the share_token against share_tokens table, then hands the socket
 * off to y-websocket's setupWSConnection using the documentId as the Yjs room.
 */
import type { Server } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'
import { db } from '../db/index.js'
import { shareTokens } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export function attachCollabServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
    if (!url.pathname.startsWith('/ws/')) {
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, url)
    })
  })

  wss.on('connection', async (ws: WebSocket, req: any, url: URL) => {
    const token = url.pathname.slice('/ws/'.length).split('/')[0]
    if (!token) { ws.close(4001, 'Missing token'); return }

    const shareRow = db.select().from(shareTokens).where(eq(shareTokens.token, token)).get()
    if (!shareRow)                                       { ws.close(4003, 'Invalid token');  return }
    if (shareRow.expiresAt && new Date(shareRow.expiresAt) < new Date())
                                                          { ws.close(4003, 'Token expired'); return }
    if (shareRow.mode !== 'collab')                       { ws.close(4003, 'Read-only token'); return }

    setupWSConnection(ws, req, { docName: shareRow.documentId, gc: true })
  })

  console.log('[flowmind] collab websocket attached at /ws/:token')
  return wss
}
