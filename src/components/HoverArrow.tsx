import { css } from '../../styled-system/css'

/** Renders upward/downward arrow when hovering over a sorted context. */
const HoverArrow = ({
  hoverArrowVisibility,
  top,
  bottom,
}: {
  hoverArrowVisibility: 'above' | 'below' | null
  /** The distance the arrow is rendered from the top of the document (px) if hoverArrowVisibility is 'above'.  */
  top: number
  /** The distance the arrow is rendered from the bottom of the document (px) if hoverArrowVisibility is 'below'.  */
  bottom: number
}) => {
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
          bottom: hoverArrowVisibility === 'below' ? `${bottom}px` : undefined,
          top: hoverArrowVisibility === 'above' ? top : undefined,
        }}
      ></div>
    )
  )
}

export default HoverArrow
