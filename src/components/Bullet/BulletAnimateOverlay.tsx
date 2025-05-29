import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import Path from '../../@types/Path'
import useBulletPosition from '../../hooks/useBulletPosition'
import attributeEquals from '../../selectors/attributeEquals'
import isContextViewActive from '../../selectors/isContextViewActive'
import rootedParentOf from '../../selectors/rootedParentOf'
import simplifyPath from '../../selectors/simplifyPath'
import thoughtToPath from '../../selectors/thoughtToPath'
import bulletElementsStore from '../../stores/bulletElementsStore'
import head from '../../util/head'
import parentOf from '../../util/parentOf'
import { getBulletOverlayFinalDuration, isMovingFromChildToUncle, isMovingFromParentToUncle } from './helpers'

type Position = {
  x: number
  y: number
} | null

const enterAct = css({
  animation: `overlayTranslation {durations.veryFast} ease-in-out forwards, opacity 1ms ease-in-out forwards`,
})

/** This animation will be triggered when the cursor moves from child to uncle.
 * The animation will runs for 150ms follows the animation of thought closing animation.
 */
const enterActiveWhenMoveChildToUncle = css({
  animation: `overlayTranslation {durations.layoutNodeAnimation} ease-in-out forwards`,
})

/* This animation will be triggered when cursor moved from parent to uncle.
 * It will be delayed for 70ms and then run for 80ms to follow the animation of thought closing animation (150ms).
 */

const enterActiveWhenMoveFromParentToUncle = css({
  animation: `overlayTranslation {durations.veryFast} ease-in-out forwards`,
  animationDelay: '70ms',
})

const base = css({ position: 'absolute', willChange: 'transform,opacity' })

/**
 * Renders an cursor bullet overlay that animate when the cursor is active.
 */
const BulletAnimateOverlay = ({
  x = 0,
  y = 0,
  path,
  indent,
  isOverlayPositionInitialized,
  setOverlayPositionInitialized,
}: {
  x: number
  y: number
  path?: Path
  indent: number
  isOverlayPositionInitialized: boolean
  setOverlayPositionInitialized: (value: boolean) => void
}) => {
  const svgElement = useRef<HTMLElement>(null)
  const [animate, setAnimate] = useState(false)

  // refs to store previous cursor path and indent values
  const prevCursor = useRef<Path | null>(null)
  const prevIndent = useRef<number>(indent)

  // ref to store prev overlay position. juga dipake utk netuin apakah overlay sudah pindah ke next cursor target apa belum
  // pas overlay masih di prev cursor, maka prevOverlayPosition value akan sama kyk position sblm translate
  // pas ovrlay sudah pindah ke next cursor target, maka prevOverlayPosition akan berubah sesuai dengan translate position
  const prevOverlayPosition = useRef<Position>(null)

  // ref to flag if this is the first render.
  // when first render true, the overlay wont animate, it also will show in the longer duration due to initial render takes longer time to render
  const firstRender = useRef(true)
  // Used to store the initial position (from getBoundingRectClient()) of the bullet overlay during the first render.
  const fromInitialPosition = useRef<{ x: number; y: number } | null>(null)

  const isInContextView = useSelector(state => path && isContextViewActive(state, parentOf(path)))

  const simplePath = useSelector(state =>
    path ? (isInContextView ? thoughtToPath(state, head(path)) : simplifyPath(state, path)) : undefined,
  )

  // Used to store the unprocessed nudge duration when the overlay changes quickly
  // and the previous duration hasn't been handled yet
  const unprocessedDuration = useRef<number>(0)

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
    if (!isOverlayPositionInitialized) {
      return 0
    }
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
    isOverlayPositionInitialized,
  ])

  const translateY = useMemo(() => {
    if (!isOverlayPositionInitialized) {
      return 0
    }
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
    isOverlayPositionInitialized,
  ])

  // useEffect to get the initial position of the bullet overlay (from getBoundingClientRect() when component in translate(0, 0))
  useEffect(() => {
    if (svgElement.current && fromInitialPosition.current === null) {
      const { x: xPos, y: yPos } = svgElement.current!.getBoundingClientRect()
      fromInitialPosition.current = {
        x: xPos,
        y: yPos,
      }

      // after we track the initial position, we can allow layout shift happens in LayoutTree level
      setOverlayPositionInitialized(true)
    }
  }, [setOverlayPositionInitialized])

  // useEffect to reset the animate state when no cursor selected
  useEffect(() => {
    if (!path?.length) {
      setAnimate(false)
      prevCursor.current = null
      prevOverlayPosition.current = null
      prevIndent.current = 0
    }
  }, [path])

  // useEffect to nudge the bullet overlay to the actual bullet position. This is needed because we cant get the accurate position of the bullet overlay using padding margin calculation only, it will give us few pixels off.
  // This effect will run when the path changes, and it will set the translateX and translateY to the actual position of the bullet overlay.
  useEffect(() => {
    if (path) {
      // Calculate the duration for the overlay's final position change animation.
      // This ensures the overlay animates smoothly to its new position, accounting for:
      // - The type of cursor movement (e.g., indent, move to uncle, etc.)
      // - Whether this is the first render (which may require a longer duration)
      // - Any unprocessed duration from a previous quick overlay change (to avoid animation glitches)
      // The maximum of the calculated duration and any leftover unprocessed duration is used.
      const finalPositionChangeDuration = Math.max(
        getBulletOverlayFinalDuration({
          nextCursor: path,
          prevCursor: prevCursor.current,
          isNextCursorHasIndent: prevIndent.current !== indent,
          firstRender: firstRender.current,
          delay: true,
        }),
        unprocessedDuration.current,
      )
      // Store the duration in case another overlay change happens before this one finishes.
      unprocessedDuration.current = finalPositionChangeDuration

      // Logic to nudge the bullet overlay to the actual bullet position.
      // A short delay is set before nudging to allow any layout shifts to complete.
      // Without this delay, the overlay may capture an inaccurate bullet position,
      // since it's reading the position while the layout is still shifting.
      const timeoutId = setTimeout(() => {
        if (fromInitialPosition.current) {
          const activeBulletSVGRef = bulletElementsStore.getState()[head(path)]

          const position = activeBulletSVGRef?.getBoundingClientRect()
          if (!position) {
            return
          }
          const { x: bulletXPos, y: yBulletPos } = position
          const initialOverlayX = fromInitialPosition.current?.x ?? 0
          const initialOverlayY = fromInitialPosition.current?.y ?? 0

          // adds extra x position when layout shift happens due to indent change
          const transformXIndent = indent * fontSize

          const transformX = bulletXPos - initialOverlayX + transformXIndent + window.scrollX

          const transformY = yBulletPos - initialOverlayY + window.scrollY

          if (svgElement.current) {
            svgElement.current.style.visibility = 'visible'
            svgElement.current.style.transform = `translateY(${transformY}px) translateX(${transformX}px)`

            prevOverlayPosition.current = {
              x: transformX,
              y: transformY,
            }
            prevIndent.current = indent
            prevCursor.current = path
            firstRender.current = false
            unprocessedDuration.current = 0
          }
        }
        setAnimate(false)
      }, finalPositionChangeDuration)

      // Cleanup function to cancel the nudge if the path changes before the nudge is completed.
      return () => {
        clearTimeout(timeoutId)
        if (unprocessedDuration.current > 0) {
          prevOverlayPosition.current = {
            x: translateX,
            y: translateY,
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, fontSize, indent])

  useEffect(() => {
    // if the cursor position changes, animate the overlay to the new position
    if (
      (prevOverlayPosition.current?.x !== translateX || prevOverlayPosition.current?.y !== translateY) &&
      prevCursor.current
    ) {
      setAnimate(true)
    }
  }, [translateX, translateY])

  const isMovingFromParentToUncleResult =
    path &&
    isMovingFromParentToUncle({
      prevCursor: prevCursor.current,
      nextCursor: path,
    })

  const isMovingFromChildToUncleResult =
    path &&
    isMovingFromChildToUncle({
      prevCursor: prevCursor.current,
      nextCursor: path,
    })

  return (
    <CSSTransition
      in={animate}
      timeout={{
        enter:
          path && !firstRender.current
            ? getBulletOverlayFinalDuration({
                nextCursor: path,
                prevCursor: prevCursor.current,
                isNextCursorHasIndent: prevIndent.current !== indent,
                firstRender: false,
              }) + 1
            : undefined,
      }}
      classNames={{
        enter: !firstRender.current
          ? isMovingFromParentToUncleResult
            ? enterActiveWhenMoveFromParentToUncle
            : isMovingFromChildToUncleResult
              ? enterActiveWhenMoveChildToUncle
              : enterAct
          : undefined,
      }}
      onEntered={() => {
        // still needed because without this code, a glitch occurs during layout shifts
        prevOverlayPosition.current = {
          x: translateX,
          y: translateY,
        }
        setAnimate(false)
      }}
      nodeRef={svgElement}
    >
      <svg
        className={base}
        viewBox='0 0 600 600'
        style={
          {
            visibility: firstRender.current || (!firstRender.current && !prevCursor.current) ? 'hidden' : null,
            height: lineHeight,
            width: lineHeight,
            transform: `translate(${prevOverlayPosition.current?.x}px, ${prevOverlayPosition.current?.y}px)`,
            // adds custom css variables so pandacss can consume the dynamic values
            '--from-x': `${prevOverlayPosition.current?.x}px`,
            '--from-y': `${prevOverlayPosition.current?.y}px`,
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
  )
}

export default BulletAnimateOverlay
