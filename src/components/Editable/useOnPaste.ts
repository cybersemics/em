import { escape as escapeHtml } from 'html-escaper'
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import { importDataActionCreator as importData } from '../../actions/importData'
import store from '../../stores/app'
import equalPath from '../../util/equalPath'
import strip from '../../util/strip'

/** Returns an onPaste handler that parses and inserts the pasted text or thoughts at the cursor. Handles plaintext and HTML, inline and nested paste. */
const useOnPaste = ({
  contentRef,
  simplePath,
  transient,
}: {
  contentRef: React.RefObject<HTMLInputElement | null>
  simplePath: SimplePath
  transient?: boolean
}) => {
  const dispatch = useDispatch()

  return useCallback(
    (e: React.ClipboardEvent) => {
      // mobile Safari copies URLs as 'text/uri-list' when the share button is used
      const plainText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/uri-list')
      const htmlText = e.clipboardData.getData('text/html')
      // Puppeteer does not allow setData with other MIME types. If the browser is controlled by automation, or the clipboard comes from em, set true.
      const isEmText = navigator.webdriver || !!e.clipboardData.getData('text/em')

      // Handle raw thought import confirmation
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
        const { cursor } = store.getState()
        const path = (cursor && equalPath(cursor, simplePath) ? cursor : simplePath) as SimplePath

        dispatch(
          importData({
            path,
            text: escapeHtml(plainText),
            html: htmlText,
            rawDestValue: strip(contentRef.current!.innerHTML, { preserveFormatting: true, preventTrim: true }),
            transient,
            isEmText,
          }),
        )
      }
    },
    [simplePath, transient, contentRef, dispatch],
  )
}

export default useOnPaste
