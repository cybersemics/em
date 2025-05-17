import { FC, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { anchorButtonRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import { alertActionCreator } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { deleteResumableFile } from '../actions/importFiles'
import { AlertType } from '../constants'
import alertStore from '../stores/alert'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
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
  const multicursor = useSelector(state => state.alert?.alertType === AlertType.MulticursorActive)
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
      onClose={alert?.showCloseLink ? onClose : undefined}
      value={alert ? value : null}
      icon={Icon ? <Icon cssRaw={css.raw({ cursor: 'default' })} size={iconSize} fill={token('colors.fg')} /> : null}
    >
      {alert?.importFileId && (
        <a
          onClick={() => {
            deleteResumableFile(alert.importFileId!)
            syncStatusStore.update({ importProgress: 1 })
            onClose?.()
          }}
        >
          cancel
        </a>
      )}

      {multicursor && (
        <a
          className={cx(anchorButtonRecipe(), css({ margin: '0 1em 1em' }))}
          {...fastClick(() => {
            dispatch(clearMulticursors())
            onClose?.()
          })}
        >
          Cancel
        </a>
      )}
    </Notification>
  )
}

export default Alert
