import React from 'react'
import * as selection from '../../device/selection'

/** Returns an onCopy handler that cuts the selection text, sets a text/em flag in the clipboard data to detect the source on paste and removes the current selection. */
const useOnCut = (event: React.ClipboardEvent) => {
  event.preventDefault()

  const currentText = selection.text()
  const currentHtml = selection.html()
  const clipboardData = event.clipboardData
  clipboardData.setData('text/plain', currentText!)
  clipboardData.setData('text/em', 'true')
  clipboardData.setData('text/html', currentHtml!)
  selection.removeCurrentSelection()
}

export default useOnCut
