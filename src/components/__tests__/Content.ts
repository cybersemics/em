import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('render EmptyThoughtspace when there are no thoughts in the root context', async () => {
  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeTruthy()
})

it('do not render EmptyThoughtspace when there are thoughts in the root context', async () => {
  await dispatch(
    importText({
      text: `
      - a
      - b
      - =test
    `,
    }),
  )

  await act(async () => vi.runOnlyPendingTimersAsync())

  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeNull()
})

it('render EmptyThoughtspace when there are only invisible thoughts in the root context', async () => {
  await dispatch(
    importText({
      text: `
      - =test
    `,
    }),
  )

  await act(async () => vi.runOnlyPendingTimersAsync())

  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeTruthy()
})
