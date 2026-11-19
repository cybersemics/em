import { act } from 'react'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { DEFAULT_FONT_SIZE } from '../../constants'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

// The shortcuts are bound only in the desktop app, so the commands are loaded as the desktop app loads them.
vi.mock('@tauri-apps/api/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
  isTauri: () => true,
}))

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Presses Command + the given key and returns the keydown event. */
const pressMeta = (key: string) => {
  const event = new KeyboardEvent('keydown', { key, metaKey: true, bubbles: true, cancelable: true })
  act(() => window.dispatchEvent(event))
  return event
}

it('increases the font size with Command/Ctrl + = in the desktop app (#6198)', () => {
  const event = pressMeta('=')

  expect(event.defaultPrevented).toBe(true)
  expect(store.getState().fontSize).toBe(DEFAULT_FONT_SIZE + 1)
})

it('decreases the font size with Command/Ctrl + - in the desktop app (#6198)', () => {
  const event = pressMeta('-')

  expect(event.defaultPrevented).toBe(true)
  expect(store.getState().fontSize).toBe(DEFAULT_FONT_SIZE - 1)
})

it('changes the font size while a modal is open, as browser zoom does (#6198)', () => {
  act(() => store.dispatch(showModal({ id: 'settings' })))

  pressMeta('=')

  expect(store.getState().showModal).toBe('settings')
  expect(store.getState().fontSize).toBe(DEFAULT_FONT_SIZE + 1)
})
