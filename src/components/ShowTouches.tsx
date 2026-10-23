import { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import TouchMark from '../@types/TouchMark'
import themeColors from '../selectors/themeColors'
import showTouchesStore from '../stores/showTouchesStore'
import durations from '../util/durations'
import trackPrimaryTouch from '../util/trackPrimaryTouch'
import trackTaps, { initialTapState } from '../util/trackTaps'

/** Radius of the dot drawn where the primary touch starts and moves. Kept to a single point so it marks the exact touch coordinates. */
const DOT_RADIUS = 1

/** Radius of the dark halo drawn behind each dot, so a dot stays visible over white text. */
const HALO_RADIUS = 1.75

/** Opacity of the dot's halo. */
const HALO_OPACITY = 0.6

/** Blur of the dot's halo in CSS px, which softens its edge into a shadow. */
const HALO_BLUR = 1.5

/** Radius of the ring drawn where the primary touch lifts, larger than a dot so the end of each touch stands out. */
const RING_RADIUS = 8

/** Radius of the outer ring of the double ring drawn where a double tap lifts. */
const DOUBLE_RING_RADIUS = 11

/** Opacity the ring drops to where the primary touch lifts while Auto Fade is off, so that the lift is visible though the ring stays on screen. */
const LIFTED_RING_OPACITY = 0.4

/** A mark with the time its fade is computed from: when it was made, or with Auto Fade off, when the next touch started and it began to fade out from the opacity it had then. Only a mark with fading set fades out while Auto Fade is off. */
type TimedMark = TouchMark & { time: number; fading?: boolean; fadeFrom?: number }

/**
 * Draws the primary touch onto a canvas as fading orange dots, with a ring that follows it while it is down and fades
 * where it lifts, doubled where it completes a double tap. Orange, and dots rather than a line, so that it cannot be
 * mistaken for the gesture trace, which is a stroke in the foreground color with a highlight glow.
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

  // Set by the drawing effect, which owns the marks that a change to Auto Fade acts on.
  const autoFadeChangeRef = useRef<((value: boolean) => void) | null>(null)
  const onSettingsChange = useCallback(
    ({ autoFade }: { autoFade: boolean }) => autoFadeChangeRef.current?.(autoFade),
    [],
  )
  showTouchesStore.useEffect(onSettingsChange)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    // the marks that have not faded yet, or with Auto Fade off, the marks of the last touch; oldest first
    const marks = { current: [] as TimedMark[] }
    // where the primary touch is now, drawn as a dot inside a ring at full opacity until it lifts or is cancelled, so the
    // whole touch is visible, including a touch held in place
    const held = { current: null as { x: number; y: number } | null }
    // the primary touch's taps, from which a double tap is told apart. See trackTaps.
    const taps = { current: initialTapState }
    const fade = durations.get('touchFade')
    const fadeOut = durations.get('touchFadeOut')
    // whether marks fade on their own, or stay until the next touch starts
    const autoFade = { current: showTouchesStore.getState().autoFade }

    /** Whether a mark is fading out, after which it is dropped. */
    const isFading = (mark: TimedMark) => autoFade.current || !!mark.fading

    /** How long a mark takes to fade out: quickly when a new touch fades out the last one, otherwise the full fade. */
    const duration = (mark: TimedMark) => (mark.fading ? fadeOut : fade)

    /** The opacity a mark has reached: fading out, or with Auto Fade off, full for a dot and dimmed for a ring. */
    const opacity = (mark: TimedMark, now: number) =>
      isFading(mark)
        ? (mark.fadeFrom ?? 1) * (1 - (now - mark.time) / duration(mark))
        : mark.kind === 'dot'
          ? 1
          : LIFTED_RING_OPACITY

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

    // shadowBlur is in canvas pixels and ignores the transform, so the halo's blur is scaled by the device pixel ratio
    const pixelRatio = { current: 1 }

    /** Sizes the canvas to the layout viewport at the device pixel ratio. Runs on mount and resize, never per touch. */
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      pixelRatio.current = ratio
      canvas.width = document.documentElement.clientWidth * ratio
      canvas.height = document.documentElement.clientHeight * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    /** Fills a circle. */
    const circle = (x: number, y: number, radius: number) => {
      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI)
      context.fill()
    }

    /** Draws every mark at its remaining opacity, drops the faded ones, and requests another frame while any are fading. */
    const draw = () => {
      const now = performance.now()
      marks.current = marks.current.filter(mark => !isFading(mark) || now - mark.time < duration(mark))
      const dots = marks.current.filter(mark => mark.kind === 'dot')
      /** Sets the opacity a mark has reached. */
      const setOpacity = (mark: TimedMark) => {
        context.globalAlpha = opacity(mark, now)
      }
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Every dot's dark halo is drawn before any dot, so where a slow drag packs the dots together the halos do not
      // cover the dots before them.
      context.fillStyle = context.shadowColor = `rgba(0, 0, 0, ${HALO_OPACITY})`
      context.shadowBlur = HALO_BLUR * pixelRatio.current
      dots.forEach(mark => {
        setOpacity(mark)
        circle(mark.x, mark.y, HALO_RADIUS)
      })
      context.globalAlpha = 1
      if (held.current) circle(held.current.x, held.current.y, HALO_RADIUS)
      context.shadowBlur = 0

      context.fillStyle = context.strokeStyle = colorRef.current
      context.lineWidth = 1
      marks.current.forEach(mark => {
        setOpacity(mark)
        if (mark.kind === 'dot') {
          circle(mark.x, mark.y, DOT_RADIUS)
        } else {
          context.beginPath()
          context.arc(mark.x, mark.y, RING_RADIUS, 0, 2 * Math.PI)
          if (mark.kind === 'doubleRing') {
            context.moveTo(mark.x + DOUBLE_RING_RADIUS, mark.y)
            context.arc(mark.x, mark.y, DOUBLE_RING_RADIUS, 0, 2 * Math.PI)
          }
          context.stroke()
        }
      })
      context.globalAlpha = 1
      if (held.current) {
        circle(held.current.x, held.current.y, DOT_RADIUS)
        context.beginPath()
        context.arc(held.current.x, held.current.y, RING_RADIUS, 0, 2 * Math.PI)
        context.stroke()
      }
      // The held dot and ring do not fade, nor do the last touch's marks while Auto Fade is off, so the canvas keeps
      // them without another frame.
      frame.id = marks.current.some(isFading) ? requestAnimationFrame(draw) : 0
    }

    /** Records the mark for the primary touch, if the event has one, and starts drawing. */
    const onTouch = (e: TouchEvent) => {
      const { primary, mark } = trackPrimaryTouch(primaryRef.current, e)
      primaryRef.current = primary
      if (!mark) return
      const now = performance.now()
      const { state, doubleTap } = trackTaps(taps.current, e.type, mark, now)
      taps.current = state
      const point = { x: mark.x + offset.left, y: mark.y + offset.top }
      held.current = mark.kind === 'dot' ? point : null
      // with Auto Fade off, a new touch fades out the last one
      if (!autoFade.current && e.type === 'touchstart') {
        marks.current = marks.current.map(mark =>
          mark.fading ? mark : { ...mark, time: now, fading: true, fadeFrom: opacity(mark, now) },
        )
      }
      marks.current = [...marks.current, { ...mark, ...point, kind: doubleTap ? 'doubleRing' : mark.kind, time: now }]
      if (!frame.id) frame.id = requestAnimationFrame(draw)
    }

    /** Follows the Auto Fade setting. Turning it on fades the marks left on screen from now, rather than from when they were made, which would remove them at once. */
    autoFadeChangeRef.current = value => {
      if (value === autoFade.current) return
      autoFade.current = value
      const now = performance.now()
      if (value) marks.current = marks.current.map(mark => ({ ...mark, time: now, fading: false, fadeFrom: undefined }))
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
      autoFadeChangeRef.current = null
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
  const showTouches = showTouchesStore.useSelector(state => state.enabled)
  return showTouches ? <TouchCanvas /> : null
}

export default ShowTouches
