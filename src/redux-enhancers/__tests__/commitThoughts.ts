import { vi } from 'vitest'
import { deleteThoughtActionCreator as deleteThought } from '../../actions/deleteThought'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { settingsActionCreator as settings } from '../../actions/settings'
import { EM_TOKEN } from '../../constants'
import { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import initStore from '../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import debugLog from '../../util/debugLog'
import head from '../../util/head'
import parentOf from '../../util/parentOf'
import storage from '../../util/storage'

beforeEach(initStore)

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
    expect(thoughtspaceRuntime.project().thoughtIndex[head(path)].value).toBe('Dark')
    expect(cacheWrite).toHaveBeenCalledWith('Settings/Theme', 'Dark')
    expect(warn).toHaveBeenCalledWith('Unable to cache first-paint settings', failure)
    await waitForThoughtspaceIdle()
    expect(thoughtspaceRuntime.project().thoughtIndex[head(path)]).toMatchObject({ value: 'Dark' })
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
