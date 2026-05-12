/**
 * Dexie (IndexedDB) — local-first document cache
 * Syncs with server but also works offline.
 */
import Dexie, { type Table } from 'dexie'

export interface LocalDoc {
  id: string
  title: string
  content: string
  updatedAt: string
  synced: boolean
}

export class FlowMindDB extends Dexie {
  docs!: Table<LocalDoc>

  constructor() {
    super('flowmind')
    this.version(1).stores({
      docs: 'id, updatedAt, synced',
    })
  }
}

export const localDb = new FlowMindDB()
