import React, { PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import { alertActionCreator as alert } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { deleteResumableFile } from '../actions/importFiles'
import { isTouch } from '../browser'
import { AlertType } from '../constants'
import useCombinedRefs from '../hooks/useCombinedRefs'
import usePositionFixed from '../hooks/usePositionFixed'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
import CloseButton from './CloseButton'

/** A popup component that can be dismissed. */
const Popup = React.forwardRef<
  HTMLDivElement,
  PropsWithChildren<{
    // used to cancel imports
    importFileId?: string
    /** If defined, will show a small x in the upper right corner. */
    onClose?: () => void
    textAlign?: 'center' | 'left' | 'right'
    value?: string | null
    cssRaw?: SystemStyleObject
  }>
>(({ children, importFileId, onClose, textAlign = 'center', cssRaw }, ref) => {
  const dispatch = useDispatch()

  const fontSize = useSelector(state => state.fontSize)
  const padding = useSelector(state => state.fontSize / 2 + 2)
  const multicursor = useSelector(state => state.alert?.alertType === AlertType.MulticursorActive)
  const positionFixedStyles = usePositionFixed()
  const useSwipeToDismissProps = useSwipeToDismiss({
    // dismiss after animation is complete to avoid touch events going to the Toolbar
    onDismissEnd: () => {
      dispatch(alert(null))
    },
  })

  const combinedRefs = useCombinedRefs(isTouch ? [useSwipeToDismissProps.ref, ref] : [ref])

  return (
    <div
      className={css(
        {
          boxShadow: 'none',
          border: 'none',
          display: 'block',
          padding: '8%',
          boxSizing: 'border-box',
          zIndex: 'popup',
          backgroundColor: 'bg',
          width: '100%',
          color: 'gray50',
          overflowY: 'auto',
          maxHeight: '100%',
          maxWidth: '100%',
        },
        cssRaw,
      )}
      {...(isTouch ? useSwipeToDismissProps : null)}
      ref={combinedRefs}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        ...positionFixedStyles,
        fontSize,
        // scale with font size to stay vertically centered over toolbar
        padding: `${padding}px 0 ${padding}px`,
        textAlign,
        ...(isTouch ? useSwipeToDismissProps.style : null),
      }}
    >
      <div data-testid='popup-value' className={css({ padding: '0.25em', backgroundColor: 'bgOverlay80' })}>
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
      {multicursor && (
        <a
          {...fastClick(() => {
            dispatch(clearMulticursors())
            onClose?.()
          })}
        >
          cancel
        </a>
      )}
      {onClose ? <CloseButton onClose={onClose} disableSwipeToDismiss /> : null}
    </div>
  )
})

Popup.displayName = 'Popup'

export default Popup
