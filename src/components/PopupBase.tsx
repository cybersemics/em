import React, { PropsWithChildren, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { alertActionCreator as alert } from '../actions/alert'
import { dismissTipActionCreator as dismissTip } from '../actions/dismissTip'
import { AlertType } from '../constants'
import useCombinedRefs from '../hooks/useCombinedRefs'
import usePositionFixed from '../hooks/usePositionFixed'
import useSwipeToDismiss from '../hooks/useSwipeToDismiss'
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
    circledCloseButton?: boolean
    /** If true, the popup will take up the full width of the screen. */
    fullScreen?: boolean
    /** If defined, will show a small x in the upper right corner. */
    onClose?: () => void
    padding?: string
    showXOnHover?: boolean
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
      children,
      circledCloseButton,
      fullScreen = false,
      onClose,
      padding,
      showXOnHover,
      textAlign,
      onMouseOver,
      onMouseLeave,
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
        dispatch([alert(null), dismissTip()])
      },
      swipeDown: true,
    })

    const borderStyles = border
      ? {
          border: '1px solid {colors.panelBorder}',
          borderRadius: '8px',
        }
      : {}

    const fullWidthStyles = fullScreen
      ? {
          boxShadow: 'none',
          border: 'none',
          display: 'block',
          width: '100%',
          height: '100%',
          marginBlock: 'auto',
          top: 0,
          bottom: 0,
        }
      : {}

    return (
      <div
        className={css({
          boxSizing: 'border-box',
          textAlign,
          zIndex: 'popup',
          // leave space so the circledCloseButton doesn't get cut off from the screen
          maxWidth: circledCloseButton ? 'calc(100% - 2em)' : '100%',
          maxHeight: '100%',
          marginInline: 'auto',
          left: 0,
          right: 0,
          width: 'max-content',
          ...borderStyles,
          ...fullWidthStyles,
          '&:hover': {
            '& [data-close-button]': {
              opacity: showXOnHover ? 1 : undefined,
            },
          },
          /** It should be possible to drag elements through a popup without interference. */
          pointerEvents: { _dragHold: 'none' },
        })}
        // disable swipe-to-dismiss when multicursor is active
        {...(!multicursor && useSwipeToDismissProps)}
        ref={useCombinedRefs([ref, useSwipeToDismissProps.ref])}
        // merge style with useSwipeToDismissProps.style (transform, transition, and touchAction for sticking to user's touch)
        style={{
          ...positionFixedStyles,
          background,
          fontSize,
          padding,
          // disable swipe-to-dismiss when multicursor is active
          ...(!multicursor && useSwipeToDismissProps.style),
        }}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        {children}
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
