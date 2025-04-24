import { RefObject, useEffect, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import Path from '../../@types/Path'
import useBulletPosition from '../../hooks/useBulletPosition'
import attributeEquals from '../../selectors/attributeEquals'
import isContextViewActive from '../../selectors/isContextViewActive'
import rootedParentOf from '../../selectors/rootedParentOf'
import simplifyPath from '../../selectors/simplifyPath'
import thoughtToPath from '../../selectors/thoughtToPath'
import head from '../../util/head'
import parentOf from '../../util/parentOf'

type Position = {
  x: number
  y: number
} | null

const enter = css({
  transform: `translateY(var(--from-y)) translateX(var(--from-x))`,
  opacity: 1,
})
const enterAct = css({
  animation: `overlayTranslation {durations.veryFast} ease-in-out forwards`,
})
const enterDone = css({
  opacity: 0,
  animation: `opacity 1ms linear forwards`,
})

const exit = css({ opacity: 0 })
const base = css({ position: 'absolute', willChange: 'transform,opacity' })

/**
 * Renders an animated bullet overlay that appears when the cursor is active.
 */
const BulletAnimateOverlay = ({ x = 0, y = 0, path }: { x?: number; y?: number; path?: Path }) => {
  const svgElement = useRef<HTMLElement>(null)

  const isInContextView = useSelector(state => path && isContextViewActive(state, parentOf(path)))
  const simplePath = useSelector(state =>
    path ? (isInContextView ? thoughtToPath(state, head(path)) : simplifyPath(state, path)) : undefined,
  )

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
  } = useBulletPosition({ path })
  const fontSize = useSelector(state => state.fontSize)

  const isTableCol1 = useSelector(state =>
    simplePath ? attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table') : false,
  )

  const isContextBreadcrumbExists = isInContextView && simplePath && simplePath.length > 1

  // calculate position of bullet for different font sizes
  // Table column 1 needs more space between the bullet and thought for some reason

  const translateX = useMemo(() => {
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

    return translateX
  }, [
    isContextBreadcrumbExists,
    thoughtAnnotationMarginLeft,
    thoughtAnnotationHorizontalPadding,
    isTableCol1,
    bulletSpanWidth,
    x,
    bulletSvgLeftPosition,
    bulletSvgMarginLeft,
    bulletSpanLeftPosition,
  ])

  const translateY = useMemo(() => {
    // calculate extra y position added because of context breadcrumb
    // calculation based on ctx breadcrumb size (font-size and padding-top) + margin-top
    const contextBreadcrumbYPadding = isContextBreadcrumbExists
      ? breadcrumbMarginTop + Math.max(fontSize, breadcrumbFontSize + breadcrumbPaddingTop)
      : 0

    // calculate Y position of overlay by adding y position + top position of bullet + extra y position when context breadcrumb is exists

    const translateY = y - glyphMarginBottom + contextBreadcrumbYPadding
    return translateY
  }, [
    isContextBreadcrumbExists,
    breadcrumbMarginTop,
    fontSize,
    breadcrumbFontSize,
    breadcrumbPaddingTop,
    y,
    glyphMarginBottom,
  ])

  const currentOverlayPosition = useRef<Position>(null)

  // get the initial position of the bullet overlay
  useEffect(() => {
    if (svgElement.current) {
      currentOverlayPosition.current = {
        x: translateX,
        y: translateY,
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <TransitionGroup>
      <CSSTransition
        key={`${translateX}-${translateY}`}
        appear
        timeout={{
          enter: 80 + 1,
          exit: 1,
        }}
        classNames={{
          enter,
          enterActive: enterAct,
          enterDone,
          exit,
        }}
        mountOnEnter
        unmountOnExit
        onEntered={() => {
          // Update the current overlay position
          currentOverlayPosition.current = {
            x: translateX,
            y: translateY,
          }
        }}
      >
        <svg
          className={base}
          viewBox='0 0 600 600'
          style={
            {
              height: lineHeight,
              width: lineHeight,
              opacity: 0,
              transform: `translate(${translateX}px, ${translateY}px)`,
              // adds custom css variables so pandacss can consume the dynamic values
              '--from-x': `${currentOverlayPosition.current?.x}px`,
              '--from-y': `${currentOverlayPosition.current?.y}px`,
              '--to-x': `${translateX}px`,
              '--to-y': `${translateY}px`,
            } as React.CSSProperties
          }
          ref={svgElement as unknown as RefObject<SVGSVGElement>}
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
      </CSSTransition>
    </TransitionGroup>
  )
}

export default BulletAnimateOverlay
