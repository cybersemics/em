import React, { FC, useCallback, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../styled-system/css'
import { anchorButtonRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import { alertActionCreator } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { deleteResumableFile } from '../actions/importFiles'
import { isTouch } from '../browser'
import { AlertType } from '../constants'
import alertStore from '../stores/alert'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'
import strip from '../util/strip'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'
import RedoIcon from './RedoIcon'
import UndoIcon from './UndoIcon'

/** An alert component that fades in and out. */
const Alert: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isDismissed, setDismiss] = useState(false)
  const alert = useSelector(state => state.alert)
  const alertStoreValue = alertStore.useState()
  const value = strip(alertStoreValue ?? alert?.value ?? '')
  const iconSize = useSelector(state => 0.78 * state.fontSize)
  const multicursor = useSelector(state => state.alert?.alertType === AlertType.MulticursorActive)
  const dispatch = useDispatch()

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    if (!alert?.showCloseLink) return
    setDismiss(true)
    dispatch(alertActionCreator(null))
  }, [alert, dispatch])

  const Icon = alert?.alertType === AlertType.Undo ? UndoIcon : alert?.alertType === AlertType.Redo ? RedoIcon : null

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      data-testid='alert'
      childFactory={(child: React.ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {alert ? (
        <FadeTransition duration='slow' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          <PopupBase
            anchorFromBottom
            anchorOffset={36}
            ref={popupRef}
            // Specify a key to force the component to re-render and thus recalculate useSwipeToDismissProps when the alert changes. Otherwise the alert gets stuck off screen in the dismiss state.
            key={value}
            circledCloseButton
            border
            center
            background={token('colors.panelBg')}
            showXOnHover
            onClose={alert.showCloseLink && !isTouch ? onClose : undefined}
            textAlign='center'
          >
            <div
              data-testid='alert-content'
              className={css({
                gap: '12px',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '0.85em 1.1em',
              })}
            >
              {Icon ? <Icon cssRaw={css.raw({ cursor: 'default' })} size={iconSize} fill={token('colors.fg')} /> : null}
              {value}
            </div>

            {alert.importFileId && (
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
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default Alert
