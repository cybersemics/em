import { useTick } from '@pixi/react'
import { BufferImageSource, MeshGeometry, Shader, Texture } from 'pixi.js'
import { RefObject, useEffect, useMemo } from 'react'
import GenieFrame from '../GenieFrame'
import { HALO_COOL, HALO_COOL_COLOR, HALO_INTENSITY, HALO_SAMPLES, HALO_SPREAD, HALO_STOPS } from '../constants'
import haloFragment from './halo.frag?raw'
import haloVertex from './halo.vert?raw'
import haloShape from './haloShape'

/** Width of the strip of the glow's colors, in pixels. The shader blends between neighboring pixels. */
const COLORS_WIDTH = 256

/**
 * The glow's colors from center to edge as a one-pixel-high strip, which the shader samples by distance from the
 * center. Built pixel by pixel from HALO_STOPS, spreading each stop outwards by HALO_SPREAD. The colors are
 * premultiplied by their alpha, as Pixi expects.
 */
const colorsTexture = (): Texture => {
  const stops = HALO_STOPS.map(([t, color]) => ({ at: Math.min(1, t ** (1 / HALO_SPREAD)), color }))
  const pixels = new Uint8Array(COLORS_WIDTH * 4)
  Array.from({ length: COLORS_WIDTH }).forEach((_, i) => {
    const at = i / (COLORS_WIDTH - 1)
    // The two stops either side of this pixel, and how far it is from the first towards the second.
    const next = Math.max(
      1,
      stops.findIndex(stop => stop.at >= at),
    )
    const a = stops[next - 1]
    const b = stops[next]
    const k = b.at > a.at ? Math.min(1, Math.max(0, (at - a.at) / (b.at - a.at))) : 1
    /** One channel of the color, blended between the two stops. */
    const channel = (shift: number) =>
      ((a.color >> shift) & 255) + (((b.color >> shift) & 255) - ((a.color >> shift) & 255)) * k
    // The glow is fully transparent only at its very edge.
    const alpha = at >= 1 ? 0 : 1
    pixels.set([channel(16) * alpha, channel(8) * alpha, channel(0) * alpha, alpha * 255], i * 4)
  })
  return new Texture({
    source: new BufferImageSource({
      resource: pixels,
      width: COLORS_WIDTH,
      height: 1,
      format: 'rgba8unorm',
      alphaMode: 'premultiplied-alpha',
    }),
  })
}

/**
 * The halo: the broad glow around the head, which trails slightly behind it, stretches with speed, and bends with the
 * path. Drawn as a rectangle covering the glow, with halo.frag working out the color of every pixel inside it from
 * the shape haloShape gives for the frame. Screen-blended, so it only ever adds light.
 */
const GenieHalo = ({ frameRef }: { frameRef: RefObject<GenieFrame> }) => {
  // The rectangle, its shader, and the glow's colors. Created once, updated every frame, destroyed on unmount.
  const { geometry, shader, colors } = useMemo(() => {
    const colors = colorsTexture()
    const shader = Shader.from({
      gl: {
        vertex: haloVertex,
        // The number of points is fixed in the shader's code, so it is defined here from the one setting.
        fragment: `#define SAMPLES ${HALO_SAMPLES}\n${haloFragment}`,
      },
      resources: {
        haloUniforms: {
          uPoints: { value: new Float32Array(HALO_SAMPLES * 4), type: 'vec4<f32>', size: HALO_SAMPLES },
          uCoolPoints: { value: new Float32Array(HALO_SAMPLES * 4), type: 'vec4<f32>', size: HALO_SAMPLES },
          uCount: { value: 1, type: 'i32' },
          uAcross: { value: 0, type: 'f32' },
          uIntensity: { value: HALO_INTENSITY, type: 'f32' },
          uCool: { value: HALO_COOL, type: 'f32' },
          uCoolColor: { value: new Float32Array(HALO_COOL_COLOR.map(c => c / 255)), type: 'vec3<f32>' },
        },
        uColors: colors.source,
      },
    })
    return {
      colors,
      // Pixi's Mesh gives its texture to its shader, so the shader carries one even though this one never samples it.
      shader: Object.assign(shader, { texture: Texture.WHITE }),
      geometry: new MeshGeometry({
        positions: new Float32Array(8),
        uvs: new Float32Array(8),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
      }),
    }
  }, [])

  useEffect(
    () => () => {
      geometry.destroy()
      shader.destroy()
      colors.destroy(true)
    },
    [colors, geometry, shader],
  )

  useTick(() => {
    const shape = haloShape(frameRef.current)
    const uniforms = shader.resources.haloUniforms.uniforms
    shape.points.forEach(({ x, y, along }, i) => uniforms.uPoints.set([x, y, along, 0], i * 4))
    shape.coolPoints.forEach(({ x, y, along }, i) => uniforms.uCoolPoints.set([x, y, along, 0], i * 4))
    uniforms.uCount = shape.points.length
    uniforms.uAcross = shape.across
    shader.resources.haloUniforms.update()

    // The rectangle's corners, in CSS pixels. They are also its UVs, which halo.vert passes to halo.frag.
    const { left, top, right, bottom } = shape.bounds
    const corners = new Float32Array([left, top, right, top, right, bottom, left, bottom])
    geometry.positions = corners
    geometry.uvs = corners
  })

  return <pixiMesh geometry={geometry} shader={shader} blendMode='screen' />
}

export default GenieHalo
