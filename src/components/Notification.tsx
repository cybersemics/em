import React, { ComponentProps, FC, ReactNode, useCallback, useRef, useState } from 'react'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { isTouch } from '../browser'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/** A popup component in which you can customize what is rendered. Used for Alerts + Tips. */
const Notification: FC<
  {
    icon?: ReactNode
    /** The content rendered with padding in the center of the notification. */
    value: ReactNode | null
    /* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */
    transitionKey: string | number
    /** Optional content rendered after the value without padding or alignment. Must be positioned independently. */
    children?: ReactNode
  } & Pick<ComponentProps<typeof PopupBase>, 'onClose' | 'textAlign' | 'onMouseOver' | 'onMouseLeave'>
> = ({ icon, onClose, value, transitionKey, children, ...props }) => {
  const [isDismissed, setIsDismissed] = useState(false)
  // Share this ref between FadeTransition and PopupBase so the fade opacity is applied directly to the
  // positioned zIndex: 'popup' element rather than to an intermediate static <span>. Without a nodeRef,
  // FadeTransition's span becomes a z-index: auto stacking context while opacity < 1, trapping the popup's
  // z-index behind #content and causing the toast to fade in behind full-screen thoughts.
  const popupRef = useRef<HTMLDivElement>(null)

  /** Dismiss the alert on close. */
  const handleClose = useCallback(() => {
    if (!onClose) return
    setIsDismissed(true)
    onClose?.()
  }, [onClose])

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      data-testid='alert'
      // Do not give this wrapper a positioning context. PopupBase switches to `position: absolute` on iOS Safari
      // when the keyboard opens (see usePositionFixed), and computes its `top` in document coordinates
      // (scrollTop-based). A positioned wrapper would become the absolute toast's containing block, which both
      // shifts the coordinate origin and — because the wrapper collapses to ~0 height around the out-of-flow
      // toast — triggers a WebKit paint/compositing failure that renders the panel background transparent while
      // the keyboard is open. Leaving the wrapper static lets the toast resolve against the initial containing
      // block (the document), matching usePositionFixed's math. The toast keeps its own zIndex: 'popup'.
      childFactory={(child: React.ReactElement<{ timeout: number }>) =>
        !isDismissed ? child : React.cloneElement(child, { timeout: 0 })
      }
    >
      {value ? (
        <FadeTransition type='slow' nodeRef={popupRef} onEntering={() => setIsDismissed(false)}>
          <PopupBase
            ref={popupRef}
            anchorFromBottom
            anchorOffset={36}
            key={transitionKey}
            circledCloseButton
            border
            background={token('colors.panelBg')}
            // uses swipe to dismess from PopupBase on mobile
            onClose={isTouch ? undefined : handleClose}
            showXOnHover
            {...props}
          >
            <div
              data-testid='alert-content'
              className={css({
                gap: '12px',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0.85em 1.1em',
                maxWidth: '30em',
              })}
            >
              {icon}
              {value}
            </div>
            {children}
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default Notification
