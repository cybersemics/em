import React, { useCallback } from 'react'
import ThoughtId from '../../@types/ThoughtId'
import * as selection from '../../device/selection'
import exportContext from '../../selectors/exportContext'
import getMulticursorThoughtIds from '../../selectors/getMulticursorThoughtIds'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import strip from '../../util/strip'
import trimBullet from '../../util/trimBullet'

/** Returns an onCopy handler that copies the selection text and sets a text/em flag in the clipboard data to detect the source is 'em' on paste. */
const useOnCopy = ({ thoughtId }: { thoughtId: ThoughtId }) => {
  const onCopy = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault()

      const state = store.getState()
      const clipboardData = event.clipboardData

      // When a multicursor is active, copy all selected thoughts, not just the focused one.
      // The Copy Cursor command also writes the full selection to the clipboard, but copyCursor uses
      // permitDefault, so this native copy event fires afterward and would otherwise clobber it with
      // only the focused thought (#3993).
      const ids = hasMulticursor(state) ? getMulticursorThoughtIds(state) : null
      const currentText = selection.text()

      // multicursor: all selected thoughts; else the current selection, falling back to the focused thought when the selection is empty.
      const plainText = ids
        ? trimBullet(ids.map(id => strip(exportContext(state, id, 'text/plain'))).join('\n'))
        : currentText || trimBullet(exportContext(state, thoughtId, 'text/plain'))
      const htmlText = ids
        ? ids.map(id => exportContext(state, id, 'text/html')).join('\n')
        : currentText
          ? selection.html()!
          : exportContext(state, thoughtId, 'text/html')

      clipboardData.setData('text/plain', plainText)
      clipboardData.setData('text/html', htmlText)
      clipboardData.setData('text/em', 'true')
    },
    [thoughtId],
  )

  return onCopy
}

export default useOnCopy
