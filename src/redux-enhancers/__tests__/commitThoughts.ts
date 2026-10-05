import { createStore } from 'redux'
import { vi } from 'vitest'
import appReducer from '../../actions/app'
import { deleteThoughtActionCreator as deleteThought } from '../../actions/deleteThought'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { settingsActionCreator as settings } from '../../actions/settings'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import db, { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import contextToThought from '../../test-helpers/contextToThought'
import initStore from '../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import debugLog from '../../util/debugLog'
import head from '../../util/head'
import initialState from '../../util/initialState'
import parentOf from '../../util/parentOf'
import storage from '../../util/storage'
import undoRedoEnhancer from '../undoRedoEnhancer'

beforeEach(initStore)

it('preserves placeholder roots when a UI action runs before the provider is ready', async () => {
  await thoughtspaceRuntime.drop()
  const initial = initialState()
  const pendingStore = createStore(appReducer, initial, undoRedoEnhancer)
  expect(db.project().getThought(HOME_TOKEN)).toBeUndefined()

  pendingStore.dispatch({ type: 'error', value: 'Storage unavailable' })

  expect(pendingStore.getState().error).toBe('Storage unavailable')
  expect(pendingStore.getState().thoughts).toBe(initial.thoughts)
})

it('keeps transient thought UI in Redux without changing the canonical view or authoring document operations', () => {
  store.dispatch(importText({ text: '- a\n- b' }))
  const before = store.getState()
  const a = contextToThought(before, ['a'])!
  const b = contextToThought(before, ['b'])!

  store.dispatch(
    updateThoughts({
      persist: false,
      thoughtIndexUpdates: {
        [a.id]: {
          ...a,
          value: 'not a document edit',
          generating: true,
          generatingPlaceholder: 'preview',
          splitSource: b.id,
        },
        [b.id]: null,
      },
    }),
  )

  const preview = store.getState()
  const rendered = getThoughtById(preview, a.id)!
  expect(preview.thoughts).toBe(before.thoughts)
  expect(db.project()).toBe(before.thoughts)
  expect(preview.undoPatches).toBe(before.undoPatches)
  expect(preview.thoughtUi[a.id]).toEqual({ generating: true, generatingPlaceholder: 'preview', splitSource: b.id })
  expect(rendered).toMatchObject({ value: 'a', generating: true, generatingPlaceholder: 'preview', splitSource: b.id })
  expect(getThoughtById({ ...preview, cursorOffset: (preview.cursorOffset ?? 0) + 1 }, a.id)).toBe(rendered)
  expect(preview.thoughts.getThought(a.id)).toBe(a)
  expect(preview.thoughts.getThought(b.id)).toBe(b)

  store.dispatch(
    updateThoughts({
      persist: false,
      thoughtIndexUpdates: { [a.id]: { ...rendered, generating: false } },
    }),
  )

  const completed = store.getState()
  expect(completed.thoughts).toBe(before.thoughts)
  expect(completed.thoughtUi[a.id]).toEqual({ generating: false, splitSource: b.id })
  expect(getThoughtById(completed, a.id)!.generatingPlaceholder).toBeUndefined()
  expect(getThoughtById(preview, a.id)).toBe(rendered)
  expect(rendered.generatingPlaceholder).toBe('preview')
})

it('holds an empty thought format without changing the canonical view or authoring document operations', () => {
  store.dispatch(importText({ text: '- ' }))
  const before = store.getState()
  const thought = contextToThought(before, [''])!

  store.dispatch({ type: 'formatSelection', command: 'bold' })

  const formatted = store.getState()
  expect(getThoughtById(formatted, thought.id)).toMatchObject({ value: '', pendingFormat: '<b>x</b>' })
  expect(formatted.thoughts).toBe(before.thoughts)
  expect(db.project()).toBe(before.thoughts)
  expect(db.project().getThought(thought.id)).toBe(thought)
  expect(formatted.undoPatches.at(-1)!.documentOperationIds).toEqual([])
})

it('publishes and persists document changes even when the first-paint settings cache throws', async () => {
  const failure = new Error('Settings cache is unavailable')
  const originalSetItem = storage.setItem
  const cacheWrite = vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
    if (key === 'Settings/Theme') throw failure
    originalSetItem(key, value)
  })
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const published = vi.fn()
  const unsubscribe = store.subscribe(published)
  try {
    expect(() => store.dispatch(settings({ key: 'Theme', value: 'Dark' }))).not.toThrow()

    const path = contextToPathOrThrow(store.getState(), [EM_TOKEN, 'Settings', 'Theme', 'Dark'], 'cache failure')
    expect(published).toHaveBeenCalled()
    expect(db.project().getThought(head(path))!.value).toBe('Dark')
    expect(cacheWrite).toHaveBeenCalledWith('Settings/Theme', 'Dark')
    expect(warn).toHaveBeenCalledWith('Unable to cache first-paint settings', failure)
    await waitForThoughtspaceIdle()
    expect(db.project().getThought(head(path))).toMatchObject({ value: 'Dark' })
  } finally {
    unsubscribe()
    cacheWrite.mockRestore()
    warn.mockRestore()
  }
})

it('logs a push entry when document changes commit, and pushSynced when persistence acknowledges them', async () => {
  debugLog.setEnabled(true)
  debugLog.clear()

  store.dispatch(importText({ text: '- a' }))

  const pushes = debugLog.read().filter(e => e.type === 'push')
  expect(pushes.length).toBeGreaterThan(0)
  expect(pushes[0].thoughtCount as number).toBeGreaterThan(0)

  // Flush scheduled UI work without looping through debugLog's self-rescheduling animation heartbeat, then wait for
  // the actual durable write; draining fake timers alone does not acknowledge the asynchronous SQLite replica.
  await vi.runOnlyPendingTimersAsync()
  await waitForThoughtspaceIdle()
  expect(debugLog.read().some(e => e.type === 'pushSynced')).toBe(true)
})

it('does not log push entries when debug logging is disabled', async () => {
  store.dispatch(importText({ text: '- a' }))
  await vi.runAllTimersAsync()
  expect(debugLog.read().filter(e => e.type === 'push' || e.type === 'pushSynced')).toEqual([])
})

it('removes a cached setting when its value becomes empty', async () => {
  store.dispatch(settings({ key: 'Theme', value: 'Dark' }))
  expect(storage.getItem('Settings/Theme')).toBe('Dark')
  const path = contextToPathOrThrow(store.getState(), [EM_TOKEN, 'Settings', 'Theme', 'Dark'], 'setting cache')

  store.dispatch(editThought({ path, oldValue: 'Dark', newValue: '' }))

  expect(storage.getItem('Settings/Theme')).toBeNull()
  await waitForThoughtspaceIdle()
})

it.each([
  ['the setting value', [EM_TOKEN, 'Settings', 'Theme', 'Dark']],
  ['the setting context', [EM_TOKEN, 'Settings', 'Theme']],
])('removes a cached setting when deleting %s, and caches its recreated value', async (_, context) => {
  store.dispatch(settings({ key: 'Theme', value: 'Dark' }))
  expect(storage.getItem('Settings/Theme')).toBe('Dark')
  const path = contextToPathOrThrow(store.getState(), context, 'setting cache')

  store.dispatch(deleteThought({ pathParent: parentOf(path), thoughtId: head(path) }))
  expect(storage.getItem('Settings/Theme')).toBeNull()

  store.dispatch(settings({ key: 'Theme', value: 'Light' }))
  expect(storage.getItem('Settings/Theme')).toBe('Light')
  await waitForThoughtspaceIdle()
})
