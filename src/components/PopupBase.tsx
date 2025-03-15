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

export type PopupBaseProps = PropsWithChildren<
  {
    /** Used to cancel imports. */
    importFileId?: string
    /** If defined, will show a small x in the upper right corner. */
    onClose?: () => void
    /** If true, the popup will be positioned at the bottom of the screen. */
    anchorFromBottom?: boolean
    /** The offset (in pixels) from the top or bottom of the screen. */
    anchorOffset?: number
    cssRaw?: SystemStyleObject
    circledCloseButton?: boolean
    showXOnHover?: boolean
    swipeDownToDismiss?: boolean
  } & Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>
>

/** A low-level popup component implementing core dismissal and positioning logic. */
const PopupBase = React.forwardRef<HTMLDivElement, PopupBaseProps>(
  (
    {
      children,
      importFileId,
      onClose,
      cssRaw,
      style,
      anchorFromBottom,
      anchorOffset,
      circledCloseButton,
      showXOnHover,
      swipeDownToDismiss,
      ...props
    },
    ref,
  ) => {
    const dispatch = useDispatch()
    const fontSize = useSelector(state => state.fontSize)
    const multicursor = useSelector(state => state.alert?.alertType === AlertType.MulticursorActive)
    /** Only for if `anchorFromBottom = true`. For calculating position on mobile safari. */
    const height = (typeof ref === 'object' && ref?.current?.getBoundingClientRect().height) || 50
    const positionFixedStyles = usePositionFixed({
      fromBottom: anchorFromBottom,
      offset: anchorOffset,
      height,
    })
    const useSwipeToDismissProps = useSwipeToDismiss({
      // dismiss after animation is complete to avoid touch events going to the Toolbar
      onDismissEnd: () => {
        dispatch(alert(null))
      },
      swipeDown: swipeDownToDismiss,
    })

    const combinedRefs = useCombinedRefs(isTouch ? [useSwipeToDismissProps.ref, ref] : [ref])

    return (
      <div
        className={css(
          showXOnHover && {
            '&:hover': {
              '& [data-close-button]': {
                opacity: 1,
              },
            },
          },
          cssRaw,
        )}
        {...(isTouch ? useSwipeToDismissProps : null)}
        ref={combinedRefs}
        // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
        style={{
          ...positionFixedStyles,
          fontSize,
          ...(isTouch ? useSwipeToDismissProps.style : null),
          ...style,
        }}
        {...props}
      >
        {children}
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
        {onClose ? (
          <CloseButton
            circled={circledCloseButton}
            cssRaw={showXOnHover ? { opacity: 0 } : undefined}
            onClose={onClose}
            disableSwipeToDismiss
          />
        ) : null}
      </div>
    )
  },
)

PopupBase.displayName = 'PopupBase'

export default PopupBase
