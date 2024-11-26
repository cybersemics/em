import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Settings } from '../constants'
import useTouchMoveTop from '../hooks/useTouchMoveTop'
import getUserSetting from '../selectors/getUserSetting'
import viewportStore from '../stores/viewport'

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const scrollTop = useTouchMoveTop()
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  const hideScrollZone = useSelector(state => state.showModal || getUserSetting(state, Settings.hideScrollZone))
  if (hideScrollZone) return null

  return (  
    <div
      className={css({
        backgroundColor: 'black',
        backgroundImage: `url('/img/scroll-zone/stardust.png')`,
        backgroundRepeat: 'repeat',
        zIndex: 'scrollZone',
        backgroundSize: '800px',
        position: 'fixed',
        left: leftHanded ? 0 : undefined,
        right: leftHanded ? undefined : 0,
        // height must exceed all possible scroll heights
        height: '999999px',
        pointerEvents: 'none',
      })}
      style={{
        transform: `translateY(-${scrollTop / 4 + 400}px)`,
        width: scrollZoneWidth,
        transition: 'transform 0.25s ease-out',
      }}
    ></div>
  )
}

export default ScrollZone
