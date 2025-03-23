import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Settings } from '../constants'
import useScrollTop from '../hooks/useScrollTop'
import getUserSetting from '../selectors/getUserSetting'
import viewportStore from '../stores/viewport'

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const scrollTop = useScrollTop()
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  const hideScrollZone = useSelector(
    state => state.showModal || state.showGestureCheatsheet || getUserSetting(state, Settings.hideScrollZone),
  )
  if (hideScrollZone) return null

  return (
    <div
      className={css({
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
        transform: `translateY(-${scrollTop / 4 + 300}px)`,
        width: scrollZoneWidth,
      }}
    ></div>
  )
}

export default ScrollZone
