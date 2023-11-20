import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import alertActionCreator from '../action-creators/alert'
import { deleteResumableFile } from '../action-creators/importFiles'
import { isTouch } from '../browser'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import themeColors from '../selectors/themeColors'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'

/** A popup component that can be dismissed. */
const Popup: FC<{
  // used to cancel imports
  importFileId?: string
  isInline?: boolean
  /** If defined, will show a small x in the upper right corner. */
  onClose?: () => void
  textAlign?: 'center' | 'left' | 'right'
  value?: string | null
}> = ({ children, importFileId, isInline, onClose, textAlign = 'center' }) => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const fontSize = useSelector((state: State) => state.fontSize)
  const useSwipeToDismissProps = useSwipeToDismiss({
    ...(isInline ? { dx: '-50%' } : null),
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alertActionCreator(null))
    },
  })

  return (
    <div
      className='alert z-index-alert'
      {...(isTouch ? useSwipeToDismissProps : null)}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        // scale with font size to stay vertically centered over toolbar
        padding: `${fontSize / 2 + 2}px 0 1em`,
        color: colors.gray50,
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        textAlign,
        /* if inline, leave room on the left side so the user can click undo/redo */
        ...(isInline ? { left: '50%', width: 'auto' } : null),
        ...(isTouch ? useSwipeToDismissProps.style : null),
      }}
    >
      <div className='alert-text' style={{ padding: '0.25em 0.5em', backgroundColor: colors.bgOverlay80 }}>
        {children}
      </div>
      {importFileId && (
        <a
          onClick={() => {
            deleteResumableFile(importFileId!)
            syncStatusStore.update({ importProgress: 1 })
            onClose?.()
          }}
        >
          cancel
        </a>
      )}
      {onClose ? (
        <a className='upper-right status-close-x text-small no-swipe-to-dismiss' {...fastClick(onClose)}>
          ✕
        </a>
      ) : null}
    </div>
  )
}

export default Popup
