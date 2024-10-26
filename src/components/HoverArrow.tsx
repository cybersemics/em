import { css } from '../../styled-system/css'

interface HoverArrowType {
  hoverArrowVisibility: 'above' | 'below' | null
  scrollTop: number
  arrowBottom: number
}

/** Renders upward/downward arrow when hovering over a sorted context. */
const HoverArrow = ({ hoverArrowVisibility, scrollTop, arrowBottom }: HoverArrowType) => {
  return (
    hoverArrowVisibility && (
      <div
        className={css({
          animation: `bobble {durations.arrowBobbleAnimation} infinite`,
          borderBottom: '20px solid rgb(155, 170, 220)',
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          height: '0',
          left: '50%',
          position: 'absolute',
          rotate: hoverArrowVisibility === 'below' ? '180deg' : undefined,
          transform: 'translateX(-50%)',
          width: '0',
          zIndex: 'hoverArrow',
        })}
        style={{
          bottom: hoverArrowVisibility === 'below' ? `${arrowBottom}px` : undefined,
          top: hoverArrowVisibility === 'above' ? scrollTop : undefined,
        }}
      ></div>
    )
  )
}

export default HoverArrow
