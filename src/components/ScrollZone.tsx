import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Settings } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import scrollTopStore from '../stores/scrollTop'
import viewportStore from '../stores/viewport'

/** An overlay for the scroll zone that blocks pointer events. */
const ScrollZone = ({ leftHanded }: { leftHanded?: boolean } = {}) => {
  const hideScrollZone = useSelector(state => state.showModal || getUserSetting(state, Settings.hideScrollZone))
  const scrollTop = scrollTopStore.useState()
  const scrollZoneWidth = viewportStore.useSelector(state => state.scrollZoneWidth)
  if (hideScrollZone) return null

  return (
    <div
      className={css({
        background: `url('/img/scroll-zone/stars.jpg')`,
        backgroundPositionX: '300px',
        backgroundSize: '2000px',
        zIndex: 'scrollZone',
        filter: 'grayscale(1)',
        position: 'fixed',
        left: leftHanded ? 0 : undefined,
        right: leftHanded ? undefined : 0,
        height: '100%',
        opacity: 0.4,
        pointerEvents: 'none',
        transition: 'backgroundPositionY {durations.slow} ease-in-out',
      })}
      style={{
        backgroundPositionY: `calc(1080px - ${scrollTop / 4}px)`,
        width: scrollZoneWidth,
      }}
    />
  )
}

export default ScrollZone
