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
    - =style
      - color
        - dodgerblue`)
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
      - backgroundColor
        - dodgerblue
      - color
        - black`)
})

it('Set the bullet color using the ColorPicker', async () => {
  store.dispatch([newThought({ value: 'a' })])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="bullet color swatches"] [aria-label="blue"]')!
  userEvent.click(textBlue)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =bullet
      - =style
        - color
          - dodgerblue`)
})

it('Clear the text color when selecting white', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - dodgerblue
      `,
    }),
  ])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textWhite = document.querySelector('[aria-label="text color swatches"] [aria-label="white"]')!
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
            - backgroundColor
              - dodgerblue
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
        - tomato`)
})

it('Clear color and when setting background color', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =style
            - color
              - dodgerblue
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
      - backgroundColor
        - tomato
      - color
        - black`)
})

it('Clear the bullet color when selecting white', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =bullet
            - =style
              - color
                - dodgerblue
      `,
    }),
  ])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="bullet color swatches"] [aria-label="white"]')!
  userEvent.click(textBlue)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a`)
})

it('Preserve other bullet attributes and styles when clearing bullet color', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =bullet
            - None
            - =style
              - color
                - dodgerblue
              - opacity
                - 0.5
      `,
    }),
  ])

  const textColorButton = document.querySelector('.toolbar-icon[aria-label="Text Color"]')!
  userEvent.click(textColorButton)

  const textBlue = document.querySelector('[aria-label="bullet color swatches"] [aria-label="white"]')!
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
