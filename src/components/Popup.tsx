import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteResumableFile } from '../actions/importFiles'
import { isTouch } from '../browser'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import themeColors from '../selectors/themeColors'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
import strip from '../util/strip'

/** A popup component that can be dismissed. */
const Popup = React.forwardRef<
  HTMLDivElement,
  {
    // used to cancel imports
    importFileId?: string
    isInline?: boolean
    /** If defined, will show a small x in the upper right corner. */
    onClose?: () => void
    textAlign?: 'center' | 'left' | 'right'
    value?: string | null
    children?: React.ReactNode
  }
>(({ children, importFileId, isInline, onClose, textAlign = 'center' }, ref) => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const padding = useSelector(state => state.fontSize / 2 + 2)
  const useSwipeToDismissProps = useSwipeToDismiss({
    ...(isInline ? { dx: '-50%' } : null),
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alert(null))
    },
  })

  return (
    <div
      ref={ref}
      className='popup z-index-popup'
      {...(isTouch ? useSwipeToDismissProps : null)}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        // scale with font size to stay vertically centered over toolbar
        padding: `${padding}px 0 ${padding}px`,
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
      <div
        className='alert-text'
        style={{ padding: '0.25em 0.5em', backgroundColor: colors.bgOverlay80 }}
        dangerouslySetInnerHTML={
          typeof children === 'string'
            ? {
                __html: strip(children, { preserveFormatting: true }),
              }
            : undefined
        }
      >
        {typeof children !== 'string' ? children : undefined}
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
})

Popup.displayName = 'Popup'

export default Popup
