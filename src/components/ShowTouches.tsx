import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import TouchMark from '../@types/TouchMark'
import themeColors from '../selectors/themeColors'
import showTouchesStore from '../stores/showTouchesStore'
import durations from '../util/durations'
import trackPrimaryTouch from '../util/trackPrimaryTouch'

/** Radius of the dot drawn where the primary touch starts and moves. */
const DOT_RADIUS = 6

/** Radius of the ring drawn where the primary touch lifts, larger than a dot so the end of each touch stands out. */
const RING_RADIUS = 13

/** A mark with the time it was made, from which its fade is computed. */
type TimedMark = TouchMark & { time: number }

/**
 * Draws the primary touch onto a canvas as fading orange dots, with a ring where it lifts. Orange, and dots rather than a
 * line, so that it cannot be mistaken for the gesture trace, which is a stroke in the foreground color with a highlight
 * glow.
 *
 * A touch event only records its mark. A single animation frame loop draws and fades the marks, and stops once the last
 * one has faded. Nothing is inserted into the DOM per event, since touchmove fires at the display's refresh rate.
 */
const TouchCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const color = useSelector(state => themeColors(state).orange)
  const colorRef = useRef(color)

  useEffect(() => {
    colorRef.current = color
  }, [color])

  // The identifier of the primary touch between events. See trackPrimaryTouch.
  const primaryRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    // the marks that have not faded yet, oldest first
    const marks = { current: [] as TimedMark[] }
    const fade = durations.get('touchFade')
    const frame = { id: 0 }

    // The canvas is position: fixed, so it is laid out against the layout viewport, while a touch's clientX and clientY
    // are measured from the visual viewport. On iOS with the keyboard up the two differ by the visual viewport's offset,
    // which is cached here on the visual viewport's own events rather than read during a touchmove. See
    // docs/ios-safari-viewport.md.
    const offset = { left: 0, top: 0 }

    /** Caches the visual viewport's offset within the layout viewport. */
    const updateOffset = () => {
      offset.left = window.visualViewport?.offsetLeft ?? 0
      offset.top = window.visualViewport?.offsetTop ?? 0
    }

    /** Sizes the canvas to the layout viewport at the device pixel ratio. Runs on mount and resize, never per touch. */
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      canvas.width = document.documentElement.clientWidth * ratio
      canvas.height = document.documentElement.clientHeight * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    /** Draws every mark at its remaining opacity, drops the faded ones, and requests another frame while any remain. */
    const draw = () => {
      const now = performance.now()
      marks.current = marks.current.filter(mark => now - mark.time < fade)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = context.strokeStyle = colorRef.current
      context.lineWidth = 2
      marks.current.forEach(mark => {
        context.globalAlpha = 1 - (now - mark.time) / fade
        context.beginPath()
        context.arc(mark.x, mark.y, mark.kind === 'dot' ? DOT_RADIUS : RING_RADIUS, 0, 2 * Math.PI)
        if (mark.kind === 'dot') context.fill()
        else context.stroke()
      })
      context.globalAlpha = 1
      frame.id = marks.current.length > 0 ? requestAnimationFrame(draw) : 0
    }

    /** Records the mark for the primary touch, if the event has one, and starts drawing. */
    const onTouch = (e: TouchEvent) => {
      const { primary, mark } = trackPrimaryTouch(primaryRef.current, e)
      primaryRef.current = primary
      if (!mark) return
      marks.current = [
        ...marks.current,
        { ...mark, x: mark.x + offset.left, y: mark.y + offset.top, time: performance.now() },
      ]
      if (!frame.id) frame.id = requestAnimationFrame(draw)
    }

    updateOffset()
    resize()

    // Passive, in the capture phase on window, and never prevented or stopped: every touch is seen before any other
    // handler can stop it, and every handler still receives it exactly as it would with the setting off.
    const options = { capture: true, passive: true }
    const types = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const
    types.forEach(type => window.addEventListener(type, onTouch, options))
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', updateOffset)
    window.visualViewport?.addEventListener('resize', updateOffset)

    return () => {
      types.forEach(type => window.removeEventListener(type, onTouch, options))
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('scroll', updateOffset)
      window.visualViewport?.removeEventListener('resize', updateOffset)
      cancelAnimationFrame(frame.id)
      primaryRef.current = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-testid='show-touches'
      className={css({
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 'showTouches',
      })}
    />
  )
}

/** Draws every touch of the primary finger while Show Touches is on for this device, for recording a video or a screenshot of a touch or gesture issue. Draws nothing, and listens to nothing, while it is off. */
const ShowTouches = () => {
  const showTouches = showTouchesStore.useState()
  return showTouches ? <TouchCanvas /> : null
}

export default ShowTouches
