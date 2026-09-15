import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import Index from '../@types/IndexType'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import type Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import type ThoughtPatch from '../@types/ThoughtPatch'
import { CACHED_SETTINGS, EM_TOKEN } from '../constants'
import db, { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import createId from '../util/createId'
import debugLog from '../util/debugLog'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import mergeBatch from '../util/mergeBatch'
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

/** Pushes database batches, frees provider cache for state-only batches, and caches settings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pushQueue: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {
    const store = createStore((state: State | undefined = initialState, action: A): State => {
      if (!state) return reducer(initialState, action)

      // apply reducer and clear push queue
      const stateNew: State = reducer(state, action)

      if (stateNew.pushQueue.length === 0) return stateNew

      // separate out updates for the database from state-only updates
      // state-only updates are only used to free up memory
      const { dbQueue, freeQueue } = _.groupBy(stateNew.pushQueue, batch =>
        batch.local || batch.remote ? 'dbQueue' : 'freeQueue',
      ) as { dbQueue?: PushBatch[]; freeQueue?: PushBatch[] }
      // Compare each queued edit with the preceding optimistic state, never with a later storage read.
      // A move must not carry an unchanged value; a rename must not carry an unchanged parent.
      const previousThoughts: Index<Thought | null> = { ...state.thoughts.thoughtIndex }
      const writes = (dbQueue ?? []).map(batch => {
        const nextThoughts = { ...previousThoughts, ...batch.thoughtIndexUpdates }
        const movePlacements = { ...batch.movePlacements }
        // Capture position against the optimistic siblings, before storage normalizes their ranks.
        for (const [id, thought] of Object.entries(batch.thoughtIndexUpdates)) {
          const previous = previousThoughts[id]
          if (
            !thought ||
            id in movePlacements ||
            (previous && thought.parentId === previous.parentId && thought.rank === previous.rank)
          )
            continue
          const siblings = Object.values(nextThoughts[thought.parentId]?.childrenMap ?? {})
            .map(childId => nextThoughts[childId])
            .filter((child): child is Thought => !!child && child.id !== id && child.rank < thought.rank)
            .sort((a, b) => a.rank - b.rank)
          movePlacements[id] = siblings.at(-1)?.id ?? null
        }
        const thoughtIndexUpdates: Index<ThoughtPatch | null> = Object.fromEntries(
          Object.entries(batch.thoughtIndexUpdates).map(([id, thought]) => {
            const previous = previousThoughts[id]
            previousThoughts[id] = thought
            return [
              id,
              !thought || !previous || previous.pending
                ? thought
                : {
                    id: thought.id,
                    ...Object.fromEntries(
                      (['value', 'created', 'lastUpdated', 'updatedBy', 'archived'] as const)
                        .filter(key => thought[key] !== previous[key])
                        .map(key => [key, thought[key]]),
                    ),
                    ...(id in movePlacements ? { parentId: thought.parentId, rank: thought.rank } : {}),
                  },
            ]
          }),
        )
        return {
          batch,
          movePlacements,
          writeId: `generation:${stateNew.thoughtspaceGeneration}:${createId()}`,
          thoughtIndexUpdates,
        }
      })

      if (
        dbQueue?.some(
          batch =>
            Object.keys(batch.thoughtIndexUpdates).length > 0 || Object.keys(batch.lexemeIndexUpdates).length > 0,
        )
      ) {
        // cache updated settings
        const settingsIds = getSettingsIds(stateNew)
        Object.entries(settingsIds).forEach(([name, id]) => {
          for (const batch of dbQueue ?? []) {
            if (id && id in batch.thoughtIndexUpdates) {
              const thought = getThoughtById(stateNew, id)
              cacheSetting(name, thought?.value || null)
            }
          }
        })

        // Log the flush so database lastUpdated stamps can be correlated with debug log entries and unlanded writes
        // detected (a `push` with no matching `pushSynced` is a write that never completed).
        const debugEnabled = debugLog.isEnabled()
        const thoughtUpdates = debugEnabled
          ? (dbQueue ?? []).flatMap(batch => Object.entries(batch.thoughtIndexUpdates))
          : []
        if (debugEnabled) {
          // sample of the thought updates being written; the full set is visible in the corresponding action entries
          const sample = thoughtUpdates.slice(0, 10).map(([id, thought]) => {
            if (!thought) return { id, deleted: true }
            const value = thought.value.length > 100 ? `${thought.value.slice(0, 100)}…` : thought.value
            return { id, value, rank: thought.rank }
          })
          debugLog.log('push', {
            batches: (dbQueue ?? []).length,
            thoughtCount: thoughtUpdates.length,
            deleteCount: thoughtUpdates.filter(([, thought]) => !thought).length,
            lexemeCount: (dbQueue ?? []).reduce((n, batch) => n + Object.keys(batch.lexemeIndexUpdates).length, 0),
            moveCount: (dbQueue ?? []).reduce((n, batch) => n + Object.keys(batch.movePlacements ?? {}).length, 0),
            local: (dbQueue ?? []).some(batch => batch.local !== false),
            remote: (dbQueue ?? []).some(batch => batch.remote !== false),
            thoughts: sample,
          })
        }

        const writeGeneration = stateNew.thoughtspaceGeneration
        const writeIds = writes.map(write => write.writeId)
        void thoughtspaceRuntime
          .persistPushQueueBatches(
            writes.map(({ batch, thoughtIndexUpdates, movePlacements, writeId }) => ({
              thoughtIndexUpdates,
              writeId,
              movePlacements,
              local: batch.local,
            })),
          )
          .then(() => {
            dbQueue?.forEach(batch => batch.idbSynced?.())
            debugLog.log('pushSynced', { thoughtCount: thoughtUpdates.length })
          })
          .catch(err => {
            if (store.getState().thoughtspaceGeneration === writeGeneration) {
              store.dispatch({ type: 'acknowledgeThoughtWrites', writeIds, error: String(err) } as unknown as A)
            }
            console.error('Thoughtspace persistence failed', err)
            debugLog.log('pushError', { error: String(err) })
          })
      }

      const freeBatch = (freeQueue || []).reduce<PushBatch>(mergeBatch, {
        thoughtIndexUpdates: {},
        lexemeIndexUpdates: {},
      })

      Object.entries(freeBatch.thoughtIndexUpdates).forEach(([id, thoughtUpdate]) => {
        if (!thoughtUpdate) {
          db.freeThought?.(id as ThoughtId)
        }
      })

      Object.entries(freeBatch.lexemeIndexUpdates).forEach(([id, lexemeUpdate]) => {
        if (!lexemeUpdate) {
          db.freeLexeme?.(id)
        }
      })

      const pendingThoughtWrites = { ...stateNew.pendingThoughtWrites }
      writes.forEach(({ movePlacements, writeId, thoughtIndexUpdates }) => {
        Object.entries(thoughtIndexUpdates).forEach(([id, patch]) => {
          const previous = pendingThoughtWrites[id]
          // Keep outstanding fields until this thought's latest write completes. Reinserting the key
          // preserves local edit order when several pending placements share a parent.
          delete pendingThoughtWrites[id]
          pendingThoughtWrites[id] = {
            writeId,
            patch: patch ? { ...previous?.patch, ...patch } : null,
            ...(id in movePlacements
              ? { afterId: movePlacements[id] }
              : previous?.afterId !== undefined
                ? { afterId: previous.afterId }
                : {}),
          }
        })
      })

      // clear push queue
      return {
        ...stateNew,
        pushQueue: [],
        pendingThoughtWrites,
      }
    }, initialState)
    return store
  }

export default pushQueue
