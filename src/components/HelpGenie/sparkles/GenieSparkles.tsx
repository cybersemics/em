import { useTick } from '@pixi/react'
import { BufferImageSource, Particle, ParticleContainer, Texture } from 'pixi.js'
import { RefObject, useEffect, useMemo, useRef } from 'react'
import GenieFrame from '../GenieFrame'
import { MEMORY, SPARKLE_OPACITY, SPARKLE_SPREAD, TRAIL_WIDTH } from '../constants'
import trailWidth from '../trail/trailWidth'

/** Radius of the dot texture every sparkle is drawn with, in pixels. Each sparkle scales it to its own size. */
const DOT_RADIUS = 16

/** A soft-edged white dot, built pixel by pixel: opaque inside, fading over the last pixel at its edge. */
const dotTexture = (): Texture => {
  const size = DOT_RADIUS * 2
  const pixels = new Uint8Array(size * size * 4)
  Array.from({ length: size * size }).forEach((_, i) => {
    const distance = Math.hypot((i % size) + 0.5 - DOT_RADIUS, Math.floor(i / size) + 0.5 - DOT_RADIUS)
    const alpha = Math.round(Math.min(1, Math.max(0, DOT_RADIUS - distance)) * 255)
    // Premultiplied: white at this alpha.
    pixels.set([alpha, alpha, alpha, alpha], i * 4)
  })
  return new Texture({
    source: new BufferImageSource({
      resource: pixels,
      width: size,
      height: size,
      format: 'rgba8unorm',
      alphaMode: 'premultiplied-alpha',
    }),
  })
}

/**
 * The sparkles: glitter along the trail. The frame holds each sparkle as it was born (see sparkles.ts); this works out
 * where each one is and how bright it is at the frame's time, and draws them all in one batch with Pixi's
 * ParticleContainer. Color-dodged, so they only show where the halo or trail is already lit.
 */
const GenieSparkles = ({ frameRef }: { frameRef: RefObject<GenieFrame> }) => {
  const containerRef = useRef<ParticleContainer>(null)
  // Pixi's particles, one per live sparkle, reused from frame to frame so none are created while the genie flies.
  const particlesRef = useRef<Particle[]>([])

  // The dot every sparkle is drawn with. Created once, destroyed on unmount.
  const texture = useMemo(dotTexture, [])
  useEffect(() => () => texture.destroy(true), [texture])

  useTick(() => {
    const container = containerRef.current
    if (!container) return
    const { motion, sparkles } = frameRef.current

    container.particleChildren = sparkles.map((sparkle, i) => {
      const particle = (particlesRef.current[i] ??= new Particle({ texture, anchorX: 0.5, anchorY: 0.5 }))
      const age = motion.now - sparkle.born
      // The trail narrows behind the head as it ages, so a sparkle moves in towards the middle of the trail with age,
      // keeping it inside. Its side (-1 to 1) sets how far off the middle it sits.
      const offset = sparkle.side * TRAIL_WIDTH * SPARKLE_SPREAD * trailWidth(age / MEMORY)
      particle.x = sparkle.x + sparkle.nx * offset
      particle.y = sparkle.y + sparkle.ny * offset
      particle.scaleX = particle.scaleY = sparkle.radius / DOT_RADIUS
      // Fades in over the first tenth of its life and out over the rest, twinkling as it goes.
      const progress = age / sparkle.life
      const twinkle = 0.6 + 0.4 * Math.sin(motion.now / 80 + sparkle.phase)
      particle.alpha = Math.min(1, progress * 10) * (1 - progress) ** 1.3 * twinkle
      return particle
    })
    container.update()
  })

  return (
    <pixiParticleContainer
      ref={containerRef}
      texture={texture}
      // Which particle properties change every frame and must be re-sent to the GPU: position, and size and fade.
      dynamicProperties={{ position: true, vertex: true, color: true }}
      alpha={SPARKLE_OPACITY}
      blendMode='color-dodge'
    />
  )
}

export default GenieSparkles
