import { FC, PropsWithChildren, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../../styled-system/css'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import ControlledAlert from '../ControlledAlert'
import LightBulbIcon from '../icons/LightBulbIcon'

const icon = (
  <div
    className={css({
      width: '2.2em',
      height: '2.2em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'lightbulbIconBg',
      borderRadius: '50%',
      aspectRatio: '1 / 1',
      position: 'relative',
    })}
  >
    <LightBulbIcon cssRaw={css.raw({ width: '50%', height: '50%', fill: 'fg' })} />
  </div>
)

/** A tip that gets displayed at the bottom of the window. */
const Tip: FC<
  PropsWithChildren<{
    display: boolean
  }>
> = ({ display, children }) => {
  const dispatch = useDispatch()

  const onClose = useCallback(() => {
    dispatch(dismissTip())
  }, [dispatch])

  if (!display) return null

  return <ControlledAlert renderedIcon={icon} transitionKey={`${display}`} value={children} onClose={onClose} />
}

Tip.displayName = 'Tip'

export default Tip
