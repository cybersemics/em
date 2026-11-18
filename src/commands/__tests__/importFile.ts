import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import importFileCommand from '../importFile'

beforeEach(initStore)
afterEach(() => vi.restoreAllMocks())

/**
 * Has the next file picker that opens return the given files, as if the user chose them, or dismiss it if there are
 * none. The browser's picker cannot be driven here, so its file input fires the event that the picker would. Returns
 * the stub, to check that the picker was opened.
 */
const pickFiles = (files: File[]) =>
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
    Object.defineProperty(this, 'files', { value: files })
    this.dispatchEvent(new Event(files.length > 0 ? 'change' : 'cancel'))
  })

/** Has the next file picker that opens return a text file with the given contents, as if the user chose it. */
const pickFile = (text: string) => pickFiles([new File([text], 'outline.txt', { type: 'text/plain' })])

it('imports the chosen file into the thought with the cursor', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
  ])
  pickFile(`
- x
  - y
`)

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - x
      - y
  - b`)
})

it('imports the chosen file into Home when there is no cursor', async () => {
  store.dispatch(
    importText({
      text: `
        - a
      `,
    }),
  )
  store.dispatch(setCursor(null))
  pickFile(`
- x
`)

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - x`)
})

it('imports nothing when the file picker is dismissed', async () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
  ])
  const picker = pickFiles([])

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  expect(picker).toHaveBeenCalled()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a`)
})

it('does not import into a divider, which a file cannot be dropped on either', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - ---
      `,
    }),
    setCursor(['---']),
  ])
  pickFile(`
- x
`)

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - ---`)
})

it('does not import into a thought whose context view is shown, which a file cannot be dropped on either', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - m
        - b
          - m
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
  ])
  pickFile(`
- x
`)

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  // In the context view, the file would be imported as a new context rather than under any thought in Home.
  expect(getLexeme(store.getState(), 'x')).toBeUndefined()
})

it('does not import into a thought listed in a context view, which a file cannot be dropped on either', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - m
        - b
          - m
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
    setCursor(['a', 'm', 'b']),
  ])
  pickFile(`
- x
`)

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  expect(getLexeme(store.getState(), 'x')).toBeUndefined()
})

it('skips a file that it cannot read, and says so, while importing the others', async () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
  ])
  // The desktop app's file picker lets any file be chosen.
  pickFiles([
    new File(['{"not": "an outline"}'], 'data.json', { type: 'application/json' }),
    new File(['- x'], 'outline.txt', { type: 'text/plain' }),
  ])

  executeCommandWithMulticursor(importFileCommand, { store, type: 'systemMenu' })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - x`)
  expect(store.getState().alert?.value).toBe(
    'data.json cannot be imported. Import reads text, markdown, html, and rtf files.',
  )
})
