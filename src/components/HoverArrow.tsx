import { css } from '../../styled-system/css'
import scrollTopStore from '../stores/scrollTop'

/** Renders upward/downward arrow when hovering over a sorted context. */
const HoverArrow = ({
  hoverArrowVisibility,
  bottom,
}: {
  hoverArrowVisibility: 'above' | 'below' | null
  /** The distance the arrow is rendered from the bottom of the document (px) if hoverArrowVisibility is 'below'.  */
  bottom: number
}) => {
  const scrollTopIfVisible = scrollTopStore.useSelector(scrollTop => (hoverArrowVisibility ? scrollTop : 0))

  return (
    hoverArrowVisibility && (
      <div
        className={css({
          animation: `bobble {durations.verySlowPulseDuration} infinite`,
          borderBottom: '20px solid {colors.highlight2}',
          borderLeft: '10px solid {colors.transparent}',
          borderRight: '10px solid {colors.transparent}',
          height: '0',
          left: '50%',
          position: 'absolute',
          rotate: hoverArrowVisibility === 'below' ? '180deg' : undefined,
          transform: 'translateX(-50%)',
          width: '0',
          zIndex: 'hoverArrow',
        })}
        style={{
          bottom: hoverArrowVisibility === 'below' ? `${bottom - scrollTopIfVisible}px` : undefined,
          top: hoverArrowVisibility === 'above' ? scrollTopIfVisible : undefined,
        }}
      ></div>
    )
  )
}

export default HoverArrow
