import { FC, PropsWithChildren, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import Notification from '../Notification'
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
  const tip = useSelector(state => state.tips[0])

  const onClose = useCallback(() => {
    dispatch(dismissTip())
  }, [dispatch])

  if (tip !== tipId) return null

  return <Notification renderedIcon={icon} transitionKey={`${tipId}`} value={children} onClose={onClose} />
}

Tip.displayName = 'Tip'

export default Tip
