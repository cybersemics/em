import { token } from '../../styled-system/tokens/index.mjs'

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
        style={{
          width: '0',
          height: '0',
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          position: 'absolute',
          top: hoverArrowVisibility === 'above' ? scrollTop : undefined,
          left: '50%',
          zIndex: 'hoverArrow',
          transform: 'translateX(-50%)',
          borderBottom: '20px solid rgb(155, 170, 220)',
          ...(hoverArrowVisibility === 'below' && {
            bottom: `${arrowBottom}px`,
            rotate: '180deg',
          }),
          animation: `bobble ${token('durations.arrowBobbleAnimation')} infinite`,
        }}
      ></div>
    )
  )
}

export default HoverArrow
