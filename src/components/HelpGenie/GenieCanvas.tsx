import { Application, extend, useApplication, useTick } from '@pixi/react'
import { useReducedMotion } from 'motion/react'
import { Container, Graphics, Mesh, ParticleContainer, RendererType, Ticker, UPDATE_PRIORITY } from 'pixi.js'
// Registers the advanced blend modes, which the sparkles' color-dodge needs.
import 'pixi.js/advanced-blend-modes'
import { useEffect, useRef, useState } from 'react'
import { css } from '../../../styled-system/css'
import GenieFrame from './GenieFrame'
import { BOB, MAX_FRAME } from './constants'
import GenieHalo from './halo/GenieHalo'
import GenieSparkles from './sparkles/GenieSparkles'
import stepGenie from './stepGenie'
import GenieTrail from './trail/GenieTrail'

// Makes these Pixi classes available as JSX elements (<pixiContainer>, <pixiMesh>, …). @pixi/react only knows the
// classes it is given, so only these end up in the bundle.
extend({ Container, Graphics, Mesh, ParticleContainer })

/**
 * A repeatable sequence of random numbers from 0 to 1, the same every time for the same seed (mulberry32). A scripted
 * flight uses it for its sparkles, so it draws the same picture every time.
 */
const seededRandom = (seed: number) => {
  // The generator's position in its sequence, advanced on every call.
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A genie at rest at a point, with no trail and no sparkles yet. */
const restingFrame = (x: number, y: number): GenieFrame => ({
  motion: { x, y, vx: 0, vy: 0, now: 0, samples: [] },
  heading: { x: 1, y: 0 },
  sparkles: [],
})

/**
 * Runs the genie inside the Pixi canvas. Once per frame, before anything is drawn, it moves the target and steps the
 * genie with stepGenie; then the halo, trail, and sparkles each draw that frame.
 *
 * This work runs in JavaScript on the CPU, which is the normal division of labour: the CPU decides where things go
 * (a few hundred numbers a frame), and the GPU turns that into pixels, which is the heavy part.
 */
const GenieLoop = ({
  start,
  still,
  target,
  followPointer,
  onFirstFrame,
}: {
  /** The frame to begin from. */
  start: GenieFrame
  /** Holds the start frame without moving. */
  still: boolean
  /** Where moveHelpGenie last sent the genie, if anywhere. */
  target: { x: number; y: number } | null
  /** Follows the pointer or a finger. */
  followPointer: boolean
  /** Called once the first frame has been drawn. */
  onFirstFrame: () => void
}) => {
  const { app } = useApplication()
  const reducedMotion = useReducedMotion()
  // The genie as of the last frame. Read by the three layers as they draw.
  const frameRef = useRef(start)
  // The point the genie is flying towards: wherever the pointer or moveHelpGenie last put it.
  const targetRef = useRef({ x: start.motion.x, y: start.motion.y })
  // Whether the first frame has been reported yet.
  const firstFrameRef = useRef(true)

  // Sending the genie with moveHelpGenie points it at the new target, until the pointer next moves.
  useEffect(() => {
    if (target) targetRef.current = target
  }, [target])

  // Follow the pointer. The canvas ignores pointer events, so listen on the window and convert to canvas coordinates.
  // The canvas's position is measured once and again only when the canvas is resized, not on every move: measuring
  // forces the browser to lay out the page if anything has changed.
  useEffect(() => {
    if (!followPointer) return
    // The canvas element, held directly: when the genie is put away, Pixi's app is destroyed before this effect is
    // cleaned up, and a resize arriving in between could no longer reach the canvas through it.
    const canvas = app.canvas
    const canvasRect = { current: canvas.getBoundingClientRect() }
    /** Re-measures the canvas's position. */
    const measure = () => {
      canvasRect.current = canvas.getBoundingClientRect()
    }
    /** Points the genie at the pointer. */
    const follow = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX - canvasRect.current.left, y: event.clientY - canvasRect.current.top }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    window.addEventListener('pointermove', follow, { passive: true })
    window.addEventListener('pointerdown', follow, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('pointermove', follow)
      window.removeEventListener('pointerdown', follow)
    }
  }, [app, followPointer])

  // Step the genie, first thing each frame, so the layers all draw the same frame.
  useTick({
    priority: UPDATE_PRIORITY.HIGH,
    callback: (ticker: Ticker) => {
      if (still) return
      frameRef.current = stepGenie(frameRef.current, {
        target: targetRef.current,
        dt: Math.min(ticker.deltaMS, MAX_FRAME),
        bob: reducedMotion ? 0 : BOB,
        random: Math.random,
      })
    },
  })

  // After the layers have drawn, report the first frame.
  useTick({
    priority: UPDATE_PRIORITY.LOW,
    callback: () => {
      if (firstFrameRef.current) {
        firstFrameRef.current = false
        onFirstFrame()
      }
    },
  })

  return (
    <pixiContainer>
      <GenieHalo frameRef={frameRef} />
      <GenieTrail frameRef={frameRef} />
      <GenieSparkles frameRef={frameRef} />
    </pixiContainer>
  )
}

/**
 * The genie's canvas: a transparent Pixi canvas that fills its parent and draws the genie in it. The parent decides
 * how it blends with what is beneath. Needs WebGL; HelpGenie checks for it before loading this.
 */
const GenieCanvas = ({
  flight,
  target = null,
  followPointer = false,
  onUnavailable,
}: {
  /**
   * Targets to fly through, one per 60Hz frame, starting at rest on the first. The genie then holds that frame, so the
   * same flight always draws the same picture. Without it, the genie starts at rest in the middle of the canvas.
   */
  flight?: { x: number; y: number }[]
  /** Where moveHelpGenie last sent the genie, if anywhere. */
  target?: { x: number; y: number } | null
  /** Follows the pointer or a finger. */
  followPointer?: boolean
  /** Called if Pixi starts without WebGL, which the halo's shader needs. */
  onUnavailable?: () => void
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [drawn, setDrawn] = useState(false)
  // Cap pixel density to leave rendering headroom on high-density screens.
  const resolution = Math.min(window.devicePixelRatio || 1, 1.5)
  // The first frame, settled once the container is measured, since the default start is its middle.
  const [start, setStart] = useState<GenieFrame | null>(null)

  useEffect(() => {
    if (start || !containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const origin = flight?.[0] ?? { x: width / 2, y: height / 2 }
    const random = seededRandom(1)
    setStart(
      (flight ?? []).reduce(
        (frame, point) => stepGenie(frame, { target: point, dt: 1000 / 60, bob: 0, random }),
        restingFrame(origin.x, origin.y),
      ),
    )
  }, [flight, start])

  return (
    <div
      ref={containerRef}
      aria-hidden='true'
      // Busy until the first frame is drawn, so a snapshot can wait for the genie rather than an empty canvas.
      aria-busy={!drawn}
      data-testid='help-genie'
      className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })}
    >
      {start && (
        <Application
          resizeTo={containerRef}
          backgroundAlpha={0}
          preference='webgl'
          antialias
          autoDensity
          resolution={resolution}
          // Advanced blend modes (the sparkles' color-dodge) read back what is already drawn.
          useBackBuffer
          // Pixi falls back to Canvas2D when WebGL fails to start, and the halo's shader cannot run there.
          onInit={app => {
            if (app.renderer.type !== RendererType.WEBGL) onUnavailable?.()
          }}
        >
          <GenieLoop
            start={start}
            still={!!flight}
            target={target}
            followPointer={followPointer}
            onFirstFrame={() => setDrawn(true)}
          />
        </Application>
      )}
    </div>
  )
}

export default GenieCanvas
