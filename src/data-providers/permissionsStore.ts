import { get, set } from 'idb-keyval'
import Index from '../@types/IndexType'
import Share from '../@types/Share'
import reactMinistore from '../stores/react-ministore'
import { tsid } from './thoughtspaceSession'

type PermissionsState = { entries: Index<Share> }

/** Key for the idb-keyval permissions blob scoped to the active tsid. */
const storageKey = (): string => `em-permissions:${tsid}`

/** Device permissions for the thoughtspace (indexed by access token). */
export const permissionsStore = reactMinistore<PermissionsState>({ entries: {} })

let loadPromise: Promise<void> | null = null

/** Loads persisted permissions from IndexedDB (no-op in unit tests). */
export const initPermissionsStore = async (): Promise<void> => {
  if (import.meta.env.MODE === 'test') {
    return
  }
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const data = await get<Index<Share>>(storageKey())
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      permissionsStore.update({ entries: data })
    }
  })()
  return loadPromise
}

/** Persists current permissions (skipped in unit tests). */
export const persistPermissions = async (): Promise<void> => {
  if (import.meta.env.MODE === 'test') {
    return
  }
  await set(storageKey(), permissionsStore.getState().entries)
}

export default {
  permissionsStore,
  initPermissionsStore,
  persistPermissions,
}
