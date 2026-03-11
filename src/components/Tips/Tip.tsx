import React, { FC, PropsWithChildren, useCallback, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { isTouch } from '../../browser'
import FadeTransition from '../FadeTransition'
import PopupBase from '../PopupBase'
import LightBulbIcon from '../icons/LightBulbIcon'

const icon = (
  <div
    className={css({
      width: '2.2em',
      height: '2.2em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'popupIconBg',
      borderRadius: '50%',
      aspectRatio: '1 / 1',
      position: 'relative',
    })}
  >
    <LightBulbIcon cssRaw={css.raw({ width: '50%', height: '50%', fill: 'fg', cursor: 'default' })} />
  </div>
)

/** A tip that gets displayed at the bottom of the window. */
const Tip: FC<
  PropsWithChildren<{
    tipId: TipId
  }>
> = ({ tipId, children }) => {
  const dispatch = useDispatch()
  const tip = useSelector(state => state.tip)
  const [isDismissed, setIsDismissed] = useState(false)

  const onClose = useCallback(() => {
    dispatch(dismissTip())
  }, [dispatch])

  const handleClose = useCallback(() => {
    setIsDismissed(true)
    onClose()
  }, [onClose])

  const value = tip === tipId ? children : null

  // if dismissed, set timeout to 0 to remove tip component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      childFactory={(child: React.ReactElement<{ timeout: number }>) =>
        !isDismissed ? child : React.cloneElement(child, { timeout: 0 })
      }
    >
      {value ? (
        <FadeTransition type='slow' onEntering={() => setIsDismissed(false)}>
          <PopupBase
            anchorFromBottom
            anchorOffset={36}
            key={tipId}
            circledCloseButton
            border
            background={token('colors.panelBg')}
            // uses swipe to dismiss from PopupBase on mobile
            onClose={isTouch ? undefined : handleClose}
            showXOnHover
          >
            <div
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
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

Tip.displayName = 'Tip'

export default Tip
