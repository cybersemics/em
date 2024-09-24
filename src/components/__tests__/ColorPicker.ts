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

it('Set the bullet color using the ColorPicker', async () => {
  await dispatch([newThought({ value: 'aaaaaabbbbbb' })])
  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - aaaaaabbbbbb
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

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - =style
        - color
          - red`)
})
