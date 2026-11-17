import _ from 'lodash'
import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { importFilesActionCreator as importFiles } from '../actions/importFiles'
import ImportIcon from '../components/icons/ImportIcon'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import conjunction from '../util/conjunction'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

/** The file extensions that importFiles reads as markdown, html, rtf, or plain or indented text. */
const EXTENSIONS = ['.txt', '.text', '.md', '.markdown', '.html', '.htm', '.rtf']

/** The id of the file input while its picker is open. */
const INPUT_ID = 'import-file-input'

/** Whether importFiles can read the file: any text, or rtf. The file picker offers only these files, except in the desktop app, where wry builds the macOS file panel itself and does not pass on the input's accept list, so every file can be chosen. A file with neither a type nor a known extension is not offered either. */
const isImportable = (file: File) =>
  file.type.startsWith('text/') ||
  file.type === 'application/rtf' ||
  EXTENSIONS.some(extension => file.name.toLowerCase().endsWith(extension))

/**
 * Opens the browser's file picker and resolves to the files the user chose, or to none if they dismissed it. Browsers
 * only open the picker while a user gesture is being handled, such as a click, a key press, or a system menu item, so
 * it must be called synchronously from one.
 *
 * The input is added to the document while the picker is open, since a detached input can be garbage collected before
 * the user has chosen, and then its change event never fires. Browsers before Safari 16.4 do not fire cancel when the
 * picker is dismissed, so the input of a dismissed picker is removed when the next one opens, and its promise is left
 * unsettled.
 */
const chooseFiles = (): Promise<File[]> =>
  new Promise(resolve => {
    document.getElementById(INPUT_ID)?.remove()

    const input = document.createElement('input')
    input.id = INPUT_ID
    input.type = 'file'
    input.multiple = true
    input.accept = [...EXTENSIONS, 'text/*', 'application/rtf'].join(',')
    input.style.display = 'none'

    /** Removes the input and resolves to the files it holds. */
    const done = () => {
      input.remove()
      resolve(Array.from(input.files ?? []))
    }
    input.addEventListener('change', done, { once: true })
    // fired instead of change when the picker is dismissed
    input.addEventListener('cancel', done, { once: true })

    document.body.appendChild(input)
    input.click()
  })

const command = {
  id: 'importFile',
  label: 'Import' as const,
  systemMenu: 'File',
  description: 'Import plain text, markdown, html, or rtf files into the current thought.',
  svg: ImportIcon,
  multicursor: false,
  // Repeat is for repeating an edit quickly, not for opening the file picker again.
  repeatable: false,
  // A file cannot be dropped on a divider, on a thought whose context view is shown, or on a thought listed in a
  // context view, so it cannot be imported into one either.
  canExecute: state =>
    isDocumentEditable() &&
    (!state.cursor ||
      (!isDivider(getThoughtById(state, head(state.cursor))?.value) &&
        !isContextViewActive(state, state.cursor) &&
        !isContextViewActive(state, parentOf(state.cursor)))),
  // Imports the chosen files the same way as dropping them on the thought with the cursor, or on Home without a cursor.
  exec: async (dispatch, getState) => {
    const [importable, skipped] = _.partition(await chooseFiles(), isImportable)

    if (importable.length > 0) {
      await dispatch(importFiles({ path: getState().cursor ?? undefined, files: importable }))
    }

    // After the import, since its progress alerts would replace this one.
    if (skipped.length > 0) {
      dispatch(
        alert(
          `${conjunction(skipped.map(file => file.name))} cannot be imported. Import reads text, markdown, html, and rtf files.`,
        ),
      )
    }
  },
} satisfies Command

export default command
