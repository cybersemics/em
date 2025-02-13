import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('unmount TreeNodes on collapse', async () => {
  await dispatch(
    importText({
      text: `
        - a
          - b
        - c
      `,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  // a is initially collapsed because cursor is set to c after import
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(2)

  await dispatch(setCursor(['a']))

  // expand a
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(3)

  await dispatch(setCursor(['c']))
  await act(vi.runOnlyPendingTimersAsync)

  // collapse a and unmount b
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(2)
})
