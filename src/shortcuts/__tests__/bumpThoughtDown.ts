import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import bumpThoughtDown from '../../shortcuts/bumpThoughtDown'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeShortcut from '../../util/executeShortcut'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('reset content editable inner html on bumpThoughtDown', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b`,
    }),
    setCursor(['a']),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector(`div[data-editable]`)?.textContent).toBe('a')

  await act(async () => {
    executeShortcut(bumpThoughtDown)
  })

  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector(`div[data-editable]`)?.textContent).toBe('')
})
