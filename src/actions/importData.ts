import SimplePath from '../@types/SimplePath'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import rootedParentOf from '../selectors/rootedParentOf'
import isMarkdown from '../util/isMarkdown'
import strip from '../util/strip'
import timestamp from '../util/timestamp'
import { importFilesActionCreator as importFiles } from './importFiles'
import { importTextActionCreator as importText } from './importText'
import { newThoughtActionCreator as newThought } from './newThought'

interface ImportDataPayload {
  path: SimplePath
  text: string
  html: string | null
  rawDestValue: string
  transient?: boolean
  isEmText?: boolean
}

/** Action-creator for importData. This is an action that handles importing content
 * into the application, choosing between importText and importFiles based on the content type.
 *
 * This action is primarily used when:
 * - Pasting content (plain text, formatted text, or HTML) into the application.
 * - Importing content from external sources.
 * - Handling clipboard data with mixed formats.
 *
 * Key features:
 * - Handles both single-line and multi-line content.
 * - Supports markdown content.
 * - Can preserve or strip text formatting based on configuration.
 *
 * Differences from other import actions:
 * - importText: Used for single-line content or markdown. Handles inline text insertion and replacement.
 * - importFiles: Used for multi-line, non-markdown content. Creates new thought structures for each line.
 *
 * @param payload - Configuration object for importing data.
 * @param payload.path - The path where the data should be imported.
 * @param payload.text - The plain text content to be imported.
 * @param payload.html - HTML content to be imported, or null if importing plain text.
 * @param payload.rawDestValue - The untrimmed destination value to preserve whitespace when combining with existing content.
 * @param payload.transient - If true, creates a new empty thought before importing the text.
 * @param payload.isEmText - If true, preserves formatting when stripping HTML. Default: false.
 *
 * @returns A Thunk that handles importing the data based on whether it is multiline or markdown.
 */
export const importDataActionCreator = ({
  path,
  text,
  html,
  rawDestValue,
  transient,
  isEmText = false,
}: ImportDataPayload): Thunk => {
  return (dispatch, getState) => {
    const state = getState()

    // If transient first add new thought and then import the text
    if (transient) {
      dispatch(
        newThought({
          at: rootedParentOf(state, path),
          value: '',
        }),
      )
    }

    const processedText = html
      ? strip(html, { preserveFormatting: isEmText, stripColors: !isEmText }).replace(/\n\s*\n+/g, '\n')
      : text.trim()

    const multiline = text.trim().includes('\n')
    const markdown = isMarkdown(processedText)

    if (!multiline || markdown) {
      dispatch(
        importText({
          // use caret position to correctly track the last navigated point for caret
          // calculated on the basis of node type we are currently focused on. `state.cursorOffset` doesn't really keep track of updated caret position when navigating within single thought. Hence selection.offset() is also used depending upon which node type we are on.
          caretPosition: (selection.isText() ? selection.offset() || 0 : state.cursorOffset) || 0,
          path,
          text: processedText,
          // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
          // pass the untrimmed old value to importText so that the whitespace is not loss when combining the existing value with the pasted value
          rawDestValue,
          // use selection start and end for importText to replace (if the imported thoughts are one line)
          ...(selection.isActive() && !selection.isCollapsed()
            ? {
                replaceStart: selection.offsetStart()!,
                replaceEnd: selection.offsetEnd()!,
              }
            : null),
        }),
      )
    } else {
      // importFiles passes preventSetCursor: true to newThought so the selection will stay disabled
      selection.clear()

      dispatch(
        importFiles({
          path,
          files: [
            {
              lastModified: timestamp(),
              name: 'from clipboard',
              size: processedText.length * 8,
              text: async () => processedText,
            },
          ],
        }),
      )
    }
  }
}

export default importDataActionCreator
