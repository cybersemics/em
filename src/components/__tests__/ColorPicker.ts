import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/* Note: This test can only test the =bullet metaprogramming attribute, not the text color or background color. This is because the text and background color are set with native execCommand, which does not work in JSDOM. A puppeteer test is needed to test text and background color. */

it('Set the bullet color using the ColorPicker', async () => {
  await dispatch([newThought({ value: 'a' })])
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  await act(async () => vi.runOnlyPendingTimersAsync())

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - =style
        - color
          - blue`)
})

it('Set the bullet color from another color using the ColorPicker', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =bullet
            - =style
              - color
                - blue
      `,
    }),
  ])

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  await act(async () => vi.runOnlyPendingTimersAsync())

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - =style
        - color
          - red`)
})
