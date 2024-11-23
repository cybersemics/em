import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Settings } from '../constants'
import useScrollTop from '../hooks/useScrollTop'
import getUserSetting from '../selectors/getUserSetting'

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const hideScrollZone = useSelector(state => state.showModal || getUserSetting(state, Settings.hideScrollZone))
  const scrollTop = useScrollTop()

  if (hideScrollZone) return null

  return (
    <div
      className={css({
        backgroundImage: `url('/img/scroll-zone/stars_cropped.png')`,
        backgroundRepeat: 'repeat',
        zIndex: 'scrollZone',
        filter: 'grayscale(1)',
        position: 'fixed',
        left: leftHanded ? 0 : undefined,
        right: leftHanded ? undefined : 0,
        // height must exceed all possible scroll heights
        height: '999999px',
        opacity: 0.4,
        pointerEvents: 'none',
      })}
      style={{
        transform: `translateY(calc(-${scrollTop / 4 + 400}px))`,
        // as per viewportStore.scrollZoneWidth = 0.39, but we just go with CSS-based calc
        width: '39vmin',
      }}
    ></div>
  )
}

export default ScrollZone
