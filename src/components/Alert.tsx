import { FC, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { alertActionCreator } from '../actions/alert'
import { AlertType } from '../constants'
import alertStore from '../stores/alert'
import strip from '../util/strip'
import Notification from './Notification'
import RedoIcon from './RedoIcon'
import UndoIcon from './UndoIcon'

/** An alert component that fades in and out. */
const Alert: FC = () => {
  const alert = useSelector(state => state.alert)
  const alertStoreValue = alertStore.useState()
  const value = strip(alertStoreValue ?? alert?.value ?? '')
  const iconSize = useSelector(state => 0.78 * state.fontSize)
  const dispatch = useDispatch()

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    dispatch(alertActionCreator(null))
  }, [dispatch])

  const Icon = alert?.alertType === AlertType.Undo ? UndoIcon : alert?.alertType === AlertType.Redo ? RedoIcon : null

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <Notification
      transitionKey={value}
      showXOnHover
      onClose={alert?.showCloseLink ? onClose : undefined}
      value={alert ? value : null}
      testId='alert'
      renderedIcon={
        Icon ? <Icon cssRaw={css.raw({ cursor: 'default' })} size={iconSize} fill={token('colors.fg')} /> : null
      }
    />
  )
}

export default Alert
