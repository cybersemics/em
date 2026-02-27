import SimplePath from '../@types/SimplePath'
import Thunk from '../@types/Thunk'
import { HOME_PATH, REGEX_NONFORMATTING_HTML } from '../constants'
import * as selection from '../device/selection'
import rootedParentOf from '../selectors/rootedParentOf'
import isMarkdown from '../util/isMarkdown'
import timestamp from '../util/timestamp'
import { importFilesActionCreator as importFiles } from './importFiles'
import { importTextActionCreator as importText } from './importText'
import { newThoughtActionCreator as newThought } from './newThought'

interface ImportDataPayload {
  path?: SimplePath
  text?: string
  html?: string | null
  rawDestValue?: string
  transient?: boolean
  isEmText?: boolean
}

/** Matches a single line of content within a body tag. This is a special for copying small bits of text from PDF's. See more below at usage. */
const REGEX_HTML_SINGLE_LINE = /<body[^>]*>\s(?:<p[^>]*>)?([^\n]*?)(?:<\/p>)?\s*<\/body>/is

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
 * @param payload.path - The path where the data should be imported. Defaults to HOME_PATH.
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
  // TODO: May need to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
  isEmText = false,
}: ImportDataPayload): Thunk => {
  return (dispatch, getState) => {
    const state = getState()

    // If transient first add new thought and then import the text
    if (transient) {
      dispatch(
        newThought({
          at: path ? rootedParentOf(state, path) : HOME_PATH,
          value: '',
        }),
      )
    }

    // When pasting from em, Chrome may inject a <meta charset='utf-8'> wrapper around the clipboard HTML.
    // Strip it so that REGEX_NONFORMATTING_HTML does not incorrectly detect the content as multiline.
    const cleanedHtml = isEmText ? html?.replace(/<meta[^>]*charset[^>]*>/i, '') || null : html

    // Copying a single word from a PDF on macOS results in text/html, which by default get processed as multiline.
    // In order to insert it directly at the caret offset of the cursor thought, we need a special case regex to match single-line content between the body tags. See importData tests for examples.
    // Otherwise it will be passed to importFiles and import as a child of the current thought.
    // Eventually importFiles should be modified to insert single-line content at the cursor offset.
    const singleLineHtml = cleanedHtml?.match(REGEX_HTML_SINGLE_LINE)?.[1]

    const processedText =
      singleLineHtml ?? (cleanedHtml ? cleanedHtml.replace(/\n\s*\n+/g, '\n') : (text?.trim() ?? ''))
    const multiline =
      !singleLineHtml &&
      (cleanedHtml ? REGEX_NONFORMATTING_HTML.test(cleanedHtml) : !!processedText?.trim().includes('\n'))

    // Check if the text is markdown, if so, prefer importText over importFiles
    const markdown = isMarkdown(processedText)

    // Resumable imports (via importFiles) import thoughts one at a time and can be resumed if the page is refreshed or there is another interruption. They have a progress bar and they allow duplicates pending descendants to be loaded and merged.
    // Non-resumable imports (via importText), in contrast, are atomic, fast, and preserve the browser selection. Due to the lack of support for duplicates pending descendants, they are only used for single line imports.
    if (!multiline || markdown) {
      dispatch(
        importText({
          // use caret position to correctly track the last navigated point for caret
          // offsetThought returns the offset relative to the entire thought's text content, not just the current text node.
          // This is necessary because rawDestValue is stripped of HTML tags, so a plain text offset is needed.
          caretPosition: (selection.isText() ? selection.offsetThought() || 0 : state.cursorOffset) || 0,
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
