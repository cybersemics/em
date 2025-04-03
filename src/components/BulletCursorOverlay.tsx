import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { isSafari, isTouch, isiPhone } from '../browser'

const isIOSSafari: boolean = isTouch && isiPhone && isSafari()
/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletCursorOverlay = ({ isCursorActive, x, y }: { isCursorActive?: boolean; x?: number; y?: number }) => {
  const svgElement = useRef<SVGSVGElement>(null)

  const fontSize = useSelector(state => state.fontSize)
  const lineHeight = fontSize * 1.25

  const bulletOverlayRadius = isIOSSafari ? 300 : 245

  const translateX = (x || 0) + lineHeight * 0.317 - lineHeight - (11 - (fontSize - 9) * 0.5)
  const translateY = (y || 0) + fontSize * (isIOSSafari ? 0.2 : 0.3)

  return (
    <svg
      className={
        // glyph({ is, showContexts, leaf }),
        css({
          // Safari has a known issue with subpixel calculations, especially during animations and with SVGs.
          // This caused the bullet slide animation to end with a jerky movement.
          // By setting "will-change: transform;", we hint to the browser that the transform property will change in the future,
          // allowing the browser to optimize the animation.
          willChange: 'transform',
          ...(isCursorActive
            ? {
                fillOpacity: 1,
                transition: `all {durations.veryFast} ease-in-out`,
              }
            : null),
        })
      }
      viewBox='0 0 600 600'
      style={{
        height: lineHeight,
        width: lineHeight,
        position: 'absolute',
        transform: `translateY(${translateY}px) translateX(${translateX}px)`,
      }}
      ref={svgElement}
    >
      <g>
        <ellipse
          ry={bulletOverlayRadius}
          rx={bulletOverlayRadius}
          cy='300'
          cx='300'
          className={css({
            fillOpacity: 0.25,
            fill: 'fg',
          })}
        />
      </g>
    </svg>
  )
}

export default BulletCursorOverlay
