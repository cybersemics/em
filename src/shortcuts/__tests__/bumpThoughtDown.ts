import { act } from '@testing-library/react'
import { importTextActionCreator as importText } from '../../actions/importText'
import bumpThoughtDown from '../../shortcuts/bumpThoughtDown'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

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

  expect(document.querySelector('div.editable')?.textContent).toBe('a')

  await act(async () => {
    executeShortcut(bumpThoughtDown)
  })

  expect(document.querySelector('div.editable')?.textContent).toBe('')
})
