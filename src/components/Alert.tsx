import React, { FC, useCallback, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { alertActionCreator } from '../actions/alert'
import { AlertType } from '../constants'
import alertStore from '../stores/alert'
import strip from '../util/strip'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'
import RedoIcon from './RedoIcon'
import UndoIcon from './UndoIcon'

const alertToIcon: { [key in AlertType]?: typeof UndoIcon } = {
  [AlertType.Undo]: UndoIcon,
  [AlertType.Redo]: RedoIcon,
}

/** An alert component that fades in and out. */
const Alert: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isDismissed, setDismiss] = useState(false)
  const alert = useSelector(state => state.alert)
  const alertStoreValue = alertStore.useState()
  const value = strip(alertStoreValue ?? alert?.value ?? '')
  const iconSize = useSelector(state => 0.78 * state.fontSize)
  const dispatch = useDispatch()
  const paddingInline = useSelector(state => (state.fontSize * 16) / 14)
  const paddingBlock = paddingInline * 0.75

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    if (!alert?.showCloseLink) return
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }, [alert, dispatch])

  const alertType = alert?.alertType
  const Icon = alertType ? alertToIcon[alertType] : null
  const renderedIcon = Icon ? <Icon size={iconSize} fill={token('colors.fg')} /> : null

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      data-testid='alert'
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {alert ? (
        <FadeTransition duration='slow' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <PopupBase
            disableTop
            cssRaw={css.raw({
              position: 'fixed',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '12px 16px',
              gap: '8px',
              bottom: '36px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'panelBg',
              border: '1px solid {colors.panelBorder}',
              borderRadius: '8px',
              zIndex: 'popup',
            })}
            ref={popupRef}
            key={value}
            data-testid='alert-content'
            onClose={onClose}
            closeButtonSize='sm'
            showXOnHover
            style={{ padding: `${paddingBlock}px ${paddingInline}px` }}
          >
            {renderedIcon}
            {value}
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default Alert
