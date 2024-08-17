import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'

let originalExecCommand: (commandId: string, showUI?: boolean, value?: string) => boolean
beforeEach(createTestApp)
afterEach(cleanupTestApp)

beforeEach(() => {
  originalExecCommand = document.execCommand
  document.execCommand = (commandId: string, showUI?: boolean, value?: string) => {
    return true
  }
})

// Make sure to restore the mock after all tests are run
afterAll(() => {
  document.execCommand = originalExecCommand
})

it('Set the text color using the ColorPicker', async () => {
  await dispatch([newThought({ value: 'aaaaaabbbbbb' })])
  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const state = store.getState()

  const thoughtId = typeof [HOME_TOKEN] === 'string' ? [HOME_TOKEN] : contextToThoughtId(state, [HOME_TOKEN])

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  console.log('thoughtId - ', thoughtId)
  expect(exported).toEqual(`- __ROOT__
  - aaaaaabbbbbb
    - =bullet
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
  await click('.toolbar-icon[aria-label="Bold"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =style
      - color
        - blue
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
  - a`)
})

it('Set the background color to the theme inverse color', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="inverse"]')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a`)
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
  - a
    - =style
      - color
        - blue`)
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
        - rgba(0, 0, 0, 1)
    - =styleAnnotation
      - backgroundColor
        - blue
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
        - blue`)
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
          - 0.5
          - =style
        - color
        - blue`)
})
