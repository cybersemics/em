import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import useBulletPosition from '../hooks/useBulletPosition'
import attributeEquals from '../selectors/attributeEquals'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletCursorOverlay = ({
  isCursorActive,
  x = 0,
  y = 0,
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

  const {
    bullet: {
      svgLeft: bulletSvgLeftPosition,
      glyphMarginBottom,
      svgMarginLeft: bulletSvgMarginLeft,
      spanLeft: bulletSpanLeftPosition,
      spanWidth: bulletSpanWidth,
    },
    ctxViewWithBreadcrumb: {
      marginTop: breadcrumbMarginTop,
      fontSize: breadcrumbFontSize,
      paddingTop: breadcrumbPaddingTop,
    },
    thoughtAnnotation: {
      horizontalPadding: thoughtAnnotationHorizontalPadding,
      marginLeft: thoughtAnnotationMarginLeft,
    },
    lineHeight,
    bulletOverlayRadius,
  } = useBulletPosition({ simplePath, path })
  const fontSize = useSelector(state => state.fontSize)

  const isTableCol1 = useSelector(state =>
    simplePath ? attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table') : false,
  )

  // if the cursor is not active, do not render the bullet overlay
  if (!isCursorActive) {
    return null
  }

  // calculate position of bullet for different font sizes
  // Table column 1 needs more space between the bullet and thought for some reason

  const isContextBreadcrumbExists = isInContextView && simplePath && simplePath.length > 1

  // calculate extra y position added because of context breadcrumb
  // calculation based on ctx breadcrumb size (font-size and padding-top) + margin-top
  const contextBreadcrumbYPadding = isContextBreadcrumbExists
    ? breadcrumbMarginTop + Math.max(fontSize, breadcrumbFontSize + breadcrumbPaddingTop)
    : 0

  // calculate extra x position added because of context breadcrumb
  // calculation based on breadcrumb (thought annotation) margin-left - padding-left
  // adds bullet width into overlay position when thought is not table view col 1
  const contextBreadcrumbXPadding = isContextBreadcrumbExists
    ? Math.floor(
        thoughtAnnotationMarginLeft - thoughtAnnotationHorizontalPadding + (!isTableCol1 ? bulletSpanWidth : 0),
      )
    : 0

  // calculate X position of overlay by adding x position + left position of bullet + extra x position when context breadcrumb is exists su
  // when thought isnt table view col 1, we need add the bullet span left position to the overlay x position

  const translateX =
    x +
    bulletSvgLeftPosition +
    bulletSvgMarginLeft +
    (isTableCol1 ? 0 : bulletSpanLeftPosition) +
    contextBreadcrumbXPadding

  // calculate X position of overlay by adding y position + top position of bullet + extra y position when context breadcrumb is exists
  const translateY = y - glyphMarginBottom + contextBreadcrumbYPadding

  return (
    <svg
      className={css({
        // Safari has a known issue with subpixel calculations, especially during animations and with SVGs.
        // This caused the bullet slide animation to end with a jerky movement.
        // By setting "will-change: transform;", we hint to the browser that the transform property will change in the future,
        // allowing the browser to optimize the animation.
        willChange: 'transform',
        ...(isCursorActive
          ? {
              fillOpacity: 1,
              transition: `transform {durations.veryFast} ease-in-out`,
            }
          : null),
      })}
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
