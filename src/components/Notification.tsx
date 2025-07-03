import React, { ComponentProps, FC, ReactNode, useCallback, useState } from 'react'
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
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {value ? (
        <FadeTransition type='slow' onEntering={() => setIsDismissed(false)}>
          <PopupBase
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
