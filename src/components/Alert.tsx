import React, { FC, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../styled-system/css'
import { anchorButton } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import { alertActionCreator } from '../actions/alert'
import { redoActionCreator as redo } from '../actions/redo'
import { undoActionCreator as undo } from '../actions/undo'
import { AlertType } from '../constants'
import isUndoEnabled from '../selectors/isUndoEnabled'
import alertStore from '../stores/alert'
import fastClick from '../util/fastClick'
import strip from '../util/strip'
import FadeTransition from './FadeTransition'
import Popup from './Popup'
import RedoIcon from './RedoIcon'
import UndoIcon from './UndoIcon'

/** An alert component that fades in and out. */
const Alert: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const alert = useSelector(state => state.alert)
  const alertStoreValue = alertStore.useState()
  const value = strip(alertStoreValue ?? alert?.value ?? '')
  const undoEnabled = useSelector(isUndoEnabled)
  const redoEnabled = useSelector(state => state.redoPatches.length > 0)
  const fontSize = useSelector(state => state.fontSize)
  const iconSize = 0.78 * fontSize

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    if (!alert?.showCloseLink) return
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }, [alert, dispatch])

  const undoOrRedo = alert?.alertType === AlertType.Undo || alert?.alertType === AlertType.Redo
  const buttons = undoOrRedo ? (
    <div className={css({ marginTop: '0.5em' })}>
      <a
        className={cx(anchorButton({ small: true, isDisabled: !undoEnabled }), css({ margin: '0.25em' }))}
        {...fastClick(() => {
          dispatch(undo())
        })}
      >
        <UndoIcon
          size={iconSize}
          fill={token('colors.bg')}
          cssRaw={css.raw({ position: 'relative', top: '0.25em', right: '0.25em' })}
        />
        Undo
      </a>
      <a
        className={cx(anchorButton({ small: true, isDisabled: !redoEnabled }), css({ margin: '0.25em' }))}
        {...fastClick(() => {
          dispatch(redo())
        })}
      >
        Redo
        <RedoIcon
          size={iconSize}
          fill={token('colors.bg')}
          cssRaw={css.raw({ position: 'relative', top: '0.25em', left: '0.25em' })}
        />
      </a>
    </div>
  ) : null

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      data-testid='alert'
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {alert ? (
        <FadeTransition duration='slow' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          {/* Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state. */}
          <Popup {...alert} ref={popupRef} onClose={onClose} key={value}>
            {value}
            {buttons}
          </Popup>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default Alert
