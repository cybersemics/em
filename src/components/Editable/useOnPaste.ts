import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import importFiles from '../../action-creators/importFiles'
import importText from '../../action-creators/importText'
import newThought from '../../action-creators/newThought'
import * as selection from '../../device/selection'
import rootedParentOf from '../../selectors/rootedParentOf'
import store from '../../stores/app'
import equalPath from '../../util/equalPath'
import isHTML from '../../util/isHTML'
import strip from '../../util/strip'
import timestamp from '../../util/timestamp'

// The number of characters of an import at which the import becomes resumable. Resumable imports (via importFiles) imports thoughts one at a time and can be resumed if the page is refreshed or there is another interruption. Non-resumable imports (via importText), in contrast, are atomic and faster for a smaller numbers of thoughts, though they have no progress bar.
const RESUMABLE_IMPORT_MIN_CHARS = 1000

/** Returns an onPaste handler that parses and inserts the pasted text or thoughts at the cursor. Handles plaintext and HTML, inline and nested paste. */
const useOnPaste = ({
  contentRef,
  simplePath,
  transient,
}: {
  contentRef: React.RefObject<HTMLInputElement>
  simplePath: SimplePath
  transient?: boolean
}) => {
  const dispatch = useDispatch()
  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      // mobile Safari copies URLs as 'text/uri-list' when the share button is used
      const plainText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/uri-list')
      const htmlText = e.clipboardData.getData('text/html')

      // import raw thoughts: confirm before overwriting state
      if (
        typeof window !== 'undefined' &&
        plainText.startsWith(`{
  "thoughtIndex": {
    "__ROOT__": {`) &&
        !window.confirm('Import raw thought state? Current state will be overwritten.')
      ) {
        e.preventDefault()
        return
      }

      // pasting from mobile copy (e.g. Choose "Share" in Twitter and select "Copy") results in blank plainText and htmlText
      // the text will still be pasted if we do not preventDefault, it just won't get stripped of html properly
      // See: https://github.com/cybersemics/em/issues/286
      if (plainText || htmlText) {
        e.preventDefault()

        // import into the live thoughts
        // neither ref.current is set here nor can newValue be stored from onChange
        // not sure exactly why, but it appears that the DOM node has been removed before the paste handler is called
        const { cursor, cursorOffset: cursorOffsetState } = store.getState()
        const path = cursor && equalPath(cursor, simplePath) ? cursor : simplePath

        // If transient first add new thought and then import the text
        if (transient) {
          dispatch(
            newThought({
              at: rootedParentOf(store.getState(), path),
              value: '',
            }),
          )
        }

        const text = isHTML(plainText) ? plainText : htmlText || plainText

        // if the imported text is less than 1,000 characters, use a non-resumable importText and avoid the overhead of importFiles
        if (text.length < RESUMABLE_IMPORT_MIN_CHARS) {
          dispatch(
            importText({
              // use caret position to correctly track the last navigated point for caret
              // calculated on the basis of node type we are currently focused on. `state.cursorOffset` doesn't really keep track of updated caret position when navigating within single thought. Hence selection.offset() is also used depending upon which node type we are on.
              caretPosition: (selection.isText() ? selection.offset() || 0 : cursorOffsetState) || 0,
              path,
              text,
              // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
              // pass the untrimmed old value to importText so that the whitespace is not loss when combining the existing value with the pasted value
              rawDestValue: strip(contentRef.current!.innerHTML, { preventTrim: true }),
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
          dispatch(
            importFiles({
              path,
              files: [
                {
                  lastModified: timestamp(),
                  name: 'from clipboard',
                  // approximate byte size of text
                  size: text.length * 8,
                  text: async () => text,
                },
              ],
            }),
          )
        }
      }
    },
    [simplePath, transient],
  )

  return onPaste
}

export default useOnPaste
