import React, { ComponentProps, FC, ReactNode, useCallback, useRef, useState } from 'react'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/** An alert component in which you can customize what is rendered. Used for Alerts + Tips. */
const ControlledAlert: FC<
  {
    renderedIcon?: ReactNode
    value: ReactNode | null
    /* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */
    transitionKey: string | number
  } & Pick<ComponentProps<typeof PopupBase>, 'onClose' | 'showXOnHover'>
> = ({ renderedIcon, onClose, value, transitionKey, ...props }) => {
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
      data-testid='alert'
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {value ? (
        <FadeTransition duration='slow' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <PopupBase
            anchorFromBottom
            anchorOffset={36}
            cssRaw={css.raw({
              boxSizing: 'border-box',
              background: 'panelBg',
              border: '1px solid {colors.panelBorder}',
              borderRadius: '8px',
              zIndex: 'popup',
              marginInline: 'auto',
              left: 0,
              right: 0,
              width: 'max-content',
              maxWidth: '530px',
            })}
            ref={popupRef}
            key={transitionKey}
            circledCloseButton
            // showXOnHover
            onClose={handleClose}
            calculatedHeight={popupRef.current?.getBoundingClientRect().height || 50}
            swipeDownToDismiss
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
              })}
            >
              {renderedIcon}
              {value}
            </div>
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default ControlledAlert
