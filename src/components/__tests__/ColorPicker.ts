import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Set the text color using the ColorPicker', async () => {
  await dispatch([newThought({ value: 'a' })])
  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - =style
        - color
          - blue
    - =style
      - color
        - blue`)
})

it('Set the text color from another color using the ColorPicker', async () => {
  await dispatch([
    importText({
      text: `
        - a
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
    - =style
      - color
        - red
    - =bullet
      - =style
        - color
          - red`)
})

it('Set the background color using the ColorPicker', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="blue"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =style
      - color
        - rgba(0, 0, 0, 1)
    - =styleAnnotation
      - backgroundColor
        - blue`)
})

it('Set the background color to the theme inverse color', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="inverse"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =style
      - color
        - rgba(0, 0, 0, 1)
    - =styleAnnotation
      - backgroundColor
        - rgba(255, 255, 255, 1)`)
})

it('Clear the text color when selecting white', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - blue
      `,
    }),
  ])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="default"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a`)
})

it('Clear background color when selecting text color', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - rgba(0, 0, 0, 1)
          - =styleAnnotation
            - backgroundColor
              - blue
      `,
    }),
  ])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =style
      - color
        - red
    - =bullet
      - =style
        - color
          - red`)
})

it('Change color to black when setting background color', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - blue
      `,
    }),
  ])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="red"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =style
      - color
        - rgba(0, 0, 0, 1)
    - =styleAnnotation
      - backgroundColor
        - red`)
})

it('Preserve other bullet attributes and styles when clearing text color', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =bullet
            - None
            - =style
              - color
                - blue
              - opacity
                - 0.5
          - =style
            - color
              - blue
      `,
    }),
  ])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="default"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - None
      - =style
        - opacity
          - 0.5`)
})
