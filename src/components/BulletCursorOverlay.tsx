import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { isSafari, isTouch, isiPhone } from '../browser'
import attributeEquals from '../selectors/attributeEquals'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import parentOf from '../util/parentOf'

const isIOSSafari: boolean = isTouch && isiPhone && isSafari()
/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletCursorOverlay = ({
  isCursorActive,
  x,
  y,
  simplePath,
  path,
}: {
  isCursorActive?: boolean
  x?: number
  y?: number
  simplePath?: SimplePath
  path?: Path
}) => {
  const svgElement = useRef<SVGSVGElement>(null)

  const isInContextView = useSelector(state => path && isContextViewActive(state, parentOf(path)))
  const fontSize = useSelector(state => state.fontSize)
  const lineHeight = fontSize * 1.25

  const bulletOverlayRadius = isIOSSafari ? 300 : 245

  const isTableCol1 = useSelector(state =>
    simplePath ? attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table') : false,
  )

  // calculate position of bullet for different font sizes
  // Table column 1 needs more space between the bullet and thought for some reason

  const isContextBreadcrumbExists = isInContextView && isTableCol1

  // if the thought has context breadcrumb, we need to adjust the position of the bullet

  const mTopCtxBreadcrumb = 0.533 * fontSize
  const pTopCtxBreadcrumb = 0.5 * fontSize
  const ctxBreadcrumbFontSize = 0.867 * fontSize
  const topPositionCtxBreadcrumb = -3
  const contextBreadcrumbYPadding = isContextBreadcrumbExists
    ? mTopCtxBreadcrumb + Math.max(fontSize, ctxBreadcrumbFontSize + pTopCtxBreadcrumb) + topPositionCtxBreadcrumb
    : 0

  const mLeftCtxBreadcrumb = 1.3 * fontSize - 14.5
  const leftPositionCtxBreadcrumb = 2
  const contextBreadcrumbXPadding = isContextBreadcrumbExists
    ? Math.floor(-mLeftCtxBreadcrumb) + leftPositionCtxBreadcrumb
    : 0

  const width = 11 - (fontSize - 9) * 0.5 + (!isInContextView && isTableCol1 ? fontSize / 4 : 0)
  const translateX = (x || 0) + lineHeight * 0.317 - lineHeight - (isTableCol1 ? 0 : width) + contextBreadcrumbXPadding
  // const translateX = (x || 0) + lineHeight * 0.317 - lineHeight  + (-extendClickWidth + -width + extendClickWidth) + width

  const translateY = (y || 0) + fontSize * (isIOSSafari ? 0.2 : 0.3) + contextBreadcrumbYPadding

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
