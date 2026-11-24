import { MotionValue, useMotionValue, useMotionValueEvent } from 'motion/react'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { css } from '../../../styled-system/css'
import { FRAME } from './discoveryDesign'
import { drawLight } from './discoveryLight'

/** How dark the app is behind Command Discovery, which is blurred so it reads as a backdrop rather than as content. */
const DIMMED = { opacity: 0.9, blur: 6 }

/**
 * How many points across the light is calculated at. Lamp light changes so gently that a few dozen points, stretched
 * over the screen and blended between, are indistinguishable from calculating every pixel, at a fraction of the cost.
 */
const LIGHT_WIDTH = 96
const LIGHT_HEIGHT = Math.round((LIGHT_WIDTH * FRAME.height) / FRAME.width)

/**
 * The light: lamps shining on the screen from behind it (discoveryLight), calculated on a small canvas stretched over
 * the screen, and redrawn only while the playhead moves. It adds its light to the dimmed app beneath it.
 */
const Light = ({ t }: { t: MotionValue<number> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** Draws the light at a moment. */
  const draw = useCallback((time: number) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    const image = context.createImageData(LIGHT_WIDTH, LIGHT_HEIGHT)
    drawLight(image.data, LIGHT_WIDTH, LIGHT_HEIGHT, time)
    context.putImageData(image, 0, 0)
  }, [])
  useLayoutEffect(() => draw(t.get()), [draw, t])
  useMotionValueEvent(t, 'change', draw)
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      width={LIGHT_WIDTH}
      height={LIGHT_HEIGHT}
      className={css({
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'plus-lighter',
      })}
    />
  )
}

/**
 * What Command Discovery plays over: the app, dimmed and blurred, and the light. The Gesture Menu fades into it while
 * the user holds on an undiscovered command, with the light still at the top of the screen, so the discovery begins on
 * the same picture and only the light moves. Fills its positioned parent, which should cover the screen. `t` is the
 * discovery's playhead; without one the light waits.
 */
const DiscoveryBase = ({ t }: { t?: MotionValue<number> }) => {
  const waiting = useMotionValue(0)
  return (
    // Not isolated: the light adds to the dimmed app beneath it, and an isolated group would also cut the blur off from
    // the app it blurs.
    <div aria-hidden className={css({ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' })}>
      {/* Blurred, then dimmed: blurring and dimming in one layer would let a sharp trace of the app through. */}
      <div
        className={css({ position: 'absolute', inset: 0 })}
        style={{ backdropFilter: `blur(${DIMMED.blur}px)`, WebkitBackdropFilter: `blur(${DIMMED.blur}px)` }}
      />
      <div
        className={css({ position: 'absolute', inset: 0, background: 'black' })}
        style={{ opacity: DIMMED.opacity }}
      />
      <Light t={t ?? waiting} />
    </div>
  )
}

export default DiscoveryBase
