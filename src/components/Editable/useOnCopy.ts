import React, { useCallback } from 'react'
import ThoughtId from '../../@types/ThoughtId'
import * as selection from '../../device/selection'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import trimBullet from '../../util/trimBullet'

/** Returns an onCopy handler that copies the selection text and sets a text/em flag in the clipboard data to detect the source is 'em' on paste. */
const useOnCopy = ({ thoughtId }: { thoughtId: ThoughtId }) => {
  const onCopy = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault()

      const state = store.getState()
      const currentText = selection.text()
      const currentHtml = selection.html()
      const clipboardData = event.clipboardData
      clipboardData.setData('text/plain', currentText!)
      clipboardData.setData('text/html', currentHtml!)

      if (!currentText) {
        const thoughtHtml = exportContext(state, thoughtId, 'text/html')
        const thoughtText = exportContext(state, thoughtId, 'text/plain')
        clipboardData.setData('text/plain', trimBullet(thoughtText))
        clipboardData.setData('text/html', thoughtHtml)
      }
      clipboardData.setData('text/em', 'true')
    },
    [thoughtId],
  )

  return onCopy
}

export default useOnCopy
