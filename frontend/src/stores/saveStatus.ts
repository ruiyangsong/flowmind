import { create } from 'zustand'

/**
 * Auto-save status, driven by the editor's debounced save loop.
 *
 *  - saved      ✓ everything synced to server
 *  - saving     ◌ writing locally / sending to server
 *  - offline    ⚠ writes succeed locally but server is unreachable
 *  - unsynced   ⚠ failed at least once, will retry on next edit
 */
export type SaveStatus = 'saved' | 'saving' | 'offline' | 'unsynced'

interface SaveState {
  status: SaveStatus
  lastSavedAt: number | null
  set: (status: SaveStatus) => void
  markSaved: () => void
}

export const useSaveStatus = create<SaveState>((set) => ({
  status: 'saved',
  lastSavedAt: null,
  set: (status) => set({ status }),
  markSaved: () => set({ status: 'saved', lastSavedAt: Date.now() }),
}))

// Reflect navigator online/offline
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => useSaveStatus.getState().set('offline'))
  window.addEventListener('online',  () => {
    if (useSaveStatus.getState().status === 'offline') useSaveStatus.getState().set('unsynced')
  })
}
