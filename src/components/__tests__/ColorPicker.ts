import userEvent from '@testing-library/user-event'
import importText from '../../action-creators/importText'
import newThought from '../../action-creators/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Set the text color using the ColorPicker', async () => {
  store.dispatch([newThought({ value: 'a' })])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="text color swatches"] [aria-label="blue"]')!
  userEvent.click(textBlue)

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
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - blue
      `,
    }),
  ])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="text color swatches"] [aria-label="red"]')!
  userEvent.click(textBlue)

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
  store.dispatch([newThought({ value: 'a' })])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="background color swatches"] [aria-label="blue"]')!
  userEvent.click(textBlue)

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
  store.dispatch([newThought({ value: 'a' })])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="background color swatches"] [aria-label="inverse"]')!
  userEvent.click(textBlue)

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
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - blue
      `,
    }),
  ])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textWhite = document.querySelector('[aria-label="text color swatches"] [aria-label="default"]')!
  userEvent.click(textWhite)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a`)
})

it('Clear background color when selecting text color', async () => {
  store.dispatch([
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

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textRed = document.querySelector('[aria-label="text color swatches"] [aria-label="red"]')!
  userEvent.click(textRed)

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
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - blue
      `,
    }),
  ])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textRed = document.querySelector('[aria-label="background color swatches"] [aria-label="red"]')!
  userEvent.click(textRed)

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
  store.dispatch([
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

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="text color swatches"] [aria-label="default"]')!
  userEvent.click(textBlue)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - None
      - =style
        - opacity
          - 0.5`)
})
