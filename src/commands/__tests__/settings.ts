import { screen } from '@testing-library/dom'
import { act } from 'react'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('opens Settings with Cmd + , (#4563)', async () => {
  const event = new KeyboardEvent('keydown', {
    key: ',',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })

  act(() => window.dispatchEvent(event))
  await act(vi.runOnlyPendingTimersAsync)

  expect(event.defaultPrevented).toBe(true)
  expect(await screen.findByRole('heading', { name: 'Settings' })).toBeVisible()
})
