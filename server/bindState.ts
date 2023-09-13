import * as Y from 'yjs'
import throttleConcat from '../src/util/throttleConcat'

/** Number of milliseconds to throttle db.storeUpdate on Doc update. */
const THROTTLE_STOREUPDATE = 1000

/** A YJS data store that can store updates. */
export interface YBindablePersistence {
  getYDoc: (docName: string) => Promise<Y.Doc>
  storeUpdate: (docName: string, update: Uint8Array) => Promise<unknown>
}

/** Syncs a doc with leveldb and subscribes to updates (throttled). Resolves when the initial state is stored. Returns a cleanup function that should be called to ensure throttled updates gets flushed to leveldb. */
// Note: @hocuspocus/extension-database is not incremental; all data is re-saved every debounced 2 sec, so we do our own throttled storage with throttleConcat.
// https://tiptap.dev/hocuspocus/server/extensions#database
const bindState = async ({
  db,
  docName,
  doc,
}: {
  db: YBindablePersistence
  docName: string
  doc: Y.Doc
}): Promise<void> => {
  const docPersisted = await db.getYDoc(docName)

  // store initial state of Doc if non-empty
  const update = Y.encodeStateAsUpdate(doc)
  if (update.length > 2) {
    await db.storeUpdate(docName, update).catch(e => {
      console.error('initState: storeUpdate', e)
    })
  }

  Y.applyUpdate(doc, Y.encodeStateAsUpdate(docPersisted))

  // throttled update handler accumulates and merges updates
  const storeUpdateThrottled = throttleConcat(
    // Note: Is it a problem that mergeUpdates does not perform garbage collection?
    // https://discuss.yjs.dev/t/throttling-yjs-updates-with-garbage-collection/1423
    (updates: Uint8Array[]) => {
      return updates.length > 0
        ? db.storeUpdate(docName, Y.mergeUpdates(updates)).catch((e: any) => {
            console.error('bindState: storeUpdate error', e)
          })
        : null
    },
    THROTTLE_STOREUPDATE,
  )

  doc.on('update', storeUpdateThrottled)
}

export default bindState
