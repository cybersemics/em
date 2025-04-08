import React, { ComponentProps, FC, ReactNode, useCallback, useRef, useState } from 'react'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/** A popup component in which you can customize what is rendered. Used for Alerts + Tips. */
const Notification: FC<
  {
    renderedIcon?: ReactNode
    value: ReactNode | null
    /* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */
    transitionKey: string | number
    testId?: string
    children?: ReactNode
  } & Pick<ComponentProps<typeof PopupBase>, 'onClose' | 'showXOnHover' | 'textAlign'>
> = ({ renderedIcon, onClose, value, transitionKey, testId, children, ...props }) => {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isDismissed, setDismiss] = useState(false)

  /** Dismiss the alert on close. */
  const handleClose = useCallback(() => {
    if (!onClose) return
    setDismiss(true)
    onClose?.()
  }, [onClose])

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      data-testid={testId}
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {value ? (
        <FadeTransition duration='slow' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          <PopupBase
            anchorFromBottom
            anchorOffset={36}
            ref={popupRef}
            key={transitionKey}
            circledCloseButton
            border
            center
            background={token('colors.panelBg')}
            onClose={handleClose}
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
              {renderedIcon}
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
