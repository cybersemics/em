import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import Index from '../@types/IndexType'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { CACHED_SETTINGS, EM_TOKEN } from '../constants'
import db from '../data-providers/yjs/thoughtspace'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import storage from '../util/storage'

// Critical settings (e.g. EM/Settings/Tutorial) are cached in local storage so there is no gap on startup.
// The getter logic is in /selectors/getSetting.ts.
// TODO: Consolidate caching logic.
// Since settings ids are dynamic, we cache them in-memory to avoid selecting them from State on every action.
// Note: If a setting id changes (e.g. if the user manually opens the Settings context and deletes a settings thought), then the app will need to be refreshed to re-load the correct id.
const cachedSettingsIds: Index<ThoughtId | undefined> = keyValueBy(CACHED_SETTINGS, name => ({ [name]: undefined }))

/** Gets a list of settings ids. First checks in-memory cache (cachedSettingsIds), then State. */
const getSettingsIds = (state: State): Index<ThoughtId | undefined> => {
  Object.keys(cachedSettingsIds).forEach(name => {
    if (cachedSettingsIds[name]) return cachedSettingsIds[name]
    const settingsId = contextToThoughtId(state, [EM_TOKEN, 'Settings', name])
    const children = getChildrenRanked(state, settingsId)
    const id = children.find(child => !isAttribute(child.value))?.id
    // cache the settings id
    // See: cachedSettingsIds
    if (id) {
      cachedSettingsIds[name] = id
    }
  })

  return cachedSettingsIds
}

/** Cache a setting in local storage. If given null, deletes it. */
const cacheSetting = (name: keyof typeof cachedSettingsIds, value: string | null): void => {
  const key = `Settings/${name}`
  if (value) {
    storage.setItem(key, value)
  } else {
    storage.removeItem(key)
  }
}

/** Merges multiple push batches into a single batch. Last write wins. */
const mergeBatch = (accum: PushBatch, batch: Partial<PushBatch>): PushBatch => ({
  ...accum,
  // merge callbacks into a single callback function
  idbSynced:
    accum.idbSynced && batch.idbSynced
      ? () => {
          accum.idbSynced!()
          batch.idbSynced!()
        }
      : accum.idbSynced || batch.idbSynced,
  thoughtIndexUpdates: {
    ...accum.thoughtIndexUpdates,
    ...batch.thoughtIndexUpdates,
  },
  lexemeIndexUpdates: {
    ...accum.lexemeIndexUpdates,
    ...batch.lexemeIndexUpdates,
  },
  recentlyEdited: {
    ...accum.recentlyEdited,
    ...batch.recentlyEdited,
  },
  pendingDeletes: [...(accum.pendingDeletes || []), ...(batch.pendingDeletes || [])],
  pendingLexemes: {
    ...(accum.pendingLexemes || {}),
    ...(batch.pendingLexemes || {}),
  },
  updates: {
    ...accum.updates,
    ...batch.updates,
  },
  local: batch.local !== false,
  remote: batch.remote !== false,
})

/** Merges state.pushQueue batches and pushes them to Yjs. Caches settings. */
const pushQueue: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)

      // apply reducer and clear push queue
      const stateNew: State = reducer(state, action)

      if (stateNew.pushQueue.length === 0) return stateNew

      // merge batches
      // last write wins
      const mergedBatch = stateNew.pushQueue.reduce(mergeBatch, {} as PushBatch)

      // cache updated settings
      const settingsIds = getSettingsIds(stateNew)
      Object.entries(settingsIds).forEach(([name, id]) => {
        if (id && id in mergedBatch.thoughtIndexUpdates) {
          const thought = getThoughtById(stateNew, id) as Thought | undefined
          cacheSetting(name, thought?.value || null)
        }
      })

      // push batch updates to database
      db.updateThoughts(
        mergedBatch.thoughtIndexUpdates,
        mergedBatch.lexemeIndexUpdates,
        mergedBatch.updates?.schemaVersion,
      ).then(mergedBatch.idbSynced)

      // clear push queue
      return { ...stateNew, pushQueue: [] }
    }, initialState)

export default pushQueue
