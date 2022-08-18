import userEvent from '@testing-library/user-event'
import importText from '../../action-creators/importText'
import newThought from '../../action-creators/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import themeColors from '../../selectors/themeColors'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import initialState from '../../util/initialState'

const colors = themeColors(initialState())

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
          - ${colors.blue}
    - =style
      - color
        - ${colors.blue}`)
})

it('Set the text color from another color using the ColorPicker', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - ${colors.blue}
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
        - ${colors.red}
    - =bullet
      - =style
        - color
          - ${colors.red}`)
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
        - ${colors.blue}`)
})

it('Clear the text color when selecting white', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - ${colors.blue}
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
              - ${colors.blue}
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
        - ${colors.red}
    - =bullet
      - =style
        - color
          - ${colors.red}`)
})

it('Change color to black when setting background color', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - ${colors.blue}
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
        - ${colors.red}`)
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
                - ${colors.blue}
              - opacity
                - 0.5
          - =style
            - color
              - ${colors.blue}
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
