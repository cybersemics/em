import React, { PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteResumableFile } from '../actions/importFiles'
import { isTouch } from '../browser'
import useCombinedRefs from '../hooks/useCombinedRefs'
import usePositionFixed from '../hooks/usePositionFixed'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
import themeColors from '../selectors/themeColors'
import syncStatusStore from '../stores/syncStatus'
import strip from '../util/strip'
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
  const colors = useSelector(themeColors)
  const fontSize = useSelector(state => state.fontSize)
  const padding = useSelector(state => state.fontSize / 2 + 2)
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
          width: '100%',
          padding: '8%',
          boxSizing: 'border-box',
          zIndex: 'popup',
          backgroundColor: 'bg',
        },
        cssRaw,
      )}
      {...(isTouch ? useSwipeToDismissProps : null)}
      ref={combinedRefs}
      // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
      style={{
        ...positionFixedStyles,
        fontSize,
        width: '100%',
        // scale with font size to stay vertically centered over toolbar
        padding: `${padding}px 0 ${padding}px`,
        color: colors.gray50,
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        textAlign,
        ...(isTouch ? useSwipeToDismissProps.style : null),
      }}
    >
      <div
        style={{
          padding: '0.25em',
          backgroundColor: colors.bgOverlay80,
        }}
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
      {onClose ? <CloseButton onClose={onClose} disableSwipeToDismiss /> : null}
    </div>
  )
})

Popup.displayName = 'Popup'

export default Popup
