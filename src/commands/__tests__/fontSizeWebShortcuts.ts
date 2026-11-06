import { act } from 'react'
import { DEFAULT_FONT_SIZE } from '../../constants'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it.each(['=', '-'])('leaves Command/Ctrl + %s to browser zoom in the web app (#6198)', key => {
  const event = new KeyboardEvent('keydown', { key, metaKey: true, bubbles: true, cancelable: true })
  act(() => window.dispatchEvent(event))

  expect(event.defaultPrevented).toBe(false)
  expect(store.getState().fontSize).toBe(DEFAULT_FONT_SIZE)
})
