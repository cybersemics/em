import React, { PropsWithChildren, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
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
    /** If true, the popup will be positioned at the bottom of the screen. */
    anchorFromBottom?: boolean
    /** The offset (in pixels) from the top or bottom of the screen. */
    anchorOffset?: number
    background?: string
    /** If true, a border will be added to the popup. */
    border?: boolean
    /** If true, the popup will be centered horizontally. */
    center?: boolean
    circledCloseButton?: boolean
    /** If true, the popup will take up the full width of the screen. */
    fullScreen?: boolean
    /** Used to cancel imports. */
    importFileId?: string
    /** If defined, will show a small x in the upper right corner. */
    onClose?: () => void
    padding?: string
    showXOnHover?: boolean
    swipeDownToDismiss?: boolean
    textAlign?: 'center' | 'left' | 'right'
  } & Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>
>

/** A low-level popup component implementing core dismissal and positioning logic. */
const PopupBase = React.forwardRef<HTMLDivElement, PopupBaseProps>(
  (
    {
      anchorFromBottom,
      anchorOffset,
      background = token('colors.bg'),
      border = false,
      center = false,
      children,
      circledCloseButton,
      fullScreen = false,
      importFileId,
      onClose,
      padding,
      showXOnHover,
      swipeDownToDismiss,
      textAlign,
    },
    ref,
  ) => {
    const dispatch = useDispatch()
    const fontSize = useSelector(state => state.fontSize)
    const multicursor = useSelector(state => state.alert?.alertType === AlertType.MulticursorActive)
    /** Used when `anchorFromBottom = true` for calculating position on mobile safari. */
    const [height, setHeight] = React.useState(50)
    useEffect(() => {
      if (typeof ref === 'object' && ref?.current && anchorFromBottom) {
        setHeight(ref.current.getBoundingClientRect().height)
      }
    }, [ref, anchorFromBottom])
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

    const borderStyles = border
      ? {
          border: '1px solid {colors.panelBorder}',
          borderRadius: '8px',
        }
      : {}

    const centerStyles = center
      ? {
          marginInline: 'auto',
          left: 0,
          right: 0,
          width: 'max-content',
        }
      : {}

    const fullWidthStyles = fullScreen
      ? {
          boxShadow: 'none',
          border: 'none',
          display: 'block',
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          maxHeight: '100%',
          maxWidth: '100%',
        }
      : {}

    return (
      <div
        className={css({
          boxSizing: 'border-box',
          textAlign,
          zIndex: 'popup',
          ...borderStyles,
          ...centerStyles,
          ...fullWidthStyles,
          '&:hover': {
            '& [data-close-button]': {
              opacity: showXOnHover ? 1 : undefined,
            },
          },
        })}
        {...(isTouch ? useSwipeToDismissProps : null)}
        ref={combinedRefs}
        // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
        style={{
          ...positionFixedStyles,
          background,
          fontSize,
          padding,
          ...(isTouch ? useSwipeToDismissProps.style : null),
        }}
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
            transparent={showXOnHover}
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
