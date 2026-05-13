import Dexie, { type Table } from 'dexie'

export interface LocalDoc {
  id: string
  title: string
  content: string   // Tiptap JSON string
  updatedAt: string
  synced: boolean   // false = has local-only changes
}

class FlowMindDB extends Dexie {
  docs!: Table<LocalDoc>

  constructor() {
    super('flowmind')
    this.version(1).stores({
      docs: 'id, updatedAt, synced',
    })
  }
}

export const localDb = new FlowMindDB()

export async function saveLocalDoc(doc: LocalDoc) {
  await localDb.docs.put(doc)
}

export async function getLocalDoc(id: string) {
  return localDb.docs.get(id)
}

export async function listLocalDocs() {
  return localDb.docs.orderBy('updatedAt').reverse().toArray()
}

export async function deleteLocalDoc(id: string) {
  await localDb.docs.delete(id)
}
