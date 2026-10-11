import GestureGeometry from './types/GestureGeometry'
import GesturePoint from './types/GesturePoint'

/** Returns exact centerline bounds, including the chevron but excluding stroke and SVG markers. */
const getGestureBounds = (geometry: GestureGeometry) => {
  const points = geometry.segments.flatMap<GesturePoint>(segment => {
    const endpoints = [segment.from, segment.to]
    if (segment.kind === 'line') return endpoints

    if (segment.kind === 'arc') {
      const start = Math.min(segment.startAngle, segment.endAngle)
      const end = Math.max(segment.startAngle, segment.endAngle)
      const { center, radius } = segment
      const extrema = [
        { angle: 0, x: center.x + radius, y: center.y },
        { angle: 90, x: center.x, y: center.y + radius },
        { angle: 180, x: center.x - radius, y: center.y },
        { angle: 270, x: center.x, y: center.y - radius },
      ].filter(({ angle }) => angle + Math.ceil((start - angle) / 360) * 360 <= end)
      return [...endpoints, ...extrema]
    }

    const extrema = (['x', 'y'] as const).flatMap(axis => {
      const denominator = segment.from[axis] - 2 * segment.control[axis] + segment.to[axis]
      if (denominator === 0) return []

      const t = (segment.from[axis] - segment.control[axis]) / denominator
      if (t <= 0 || t >= 1) return []

      const remaining = 1 - t
      return [
        {
          x: remaining ** 2 * segment.from.x + 2 * remaining * t * segment.control.x + t ** 2 * segment.to.x,
          y: remaining ** 2 * segment.from.y + 2 * remaining * t * segment.control.y + t ** 2 * segment.to.y,
        },
      ]
    })
    return [...endpoints, ...extrema]
  })
  const allPoints = [...points, ...(geometry.chevron ?? [])]
  if (allPoints.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

  const extrema = allPoints.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  )
  return {
    x: extrema.minX,
    y: extrema.minY,
    width: extrema.maxX - extrema.minX,
    height: extrema.maxY - extrema.minY,
  }
}

export default getGestureBounds
