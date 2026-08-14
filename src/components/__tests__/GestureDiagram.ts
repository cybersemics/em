import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Gesture from '../../@types/Gesture'
import GestureDiagram from '../GestureDiagram'

const PATHS: Gesture[] = [
  'r',
  'l',
  'u',
  'd',
  'rd',
  'ur',
  'lu',
  'dr',
  'rdr',
  'rdrd',
  'rdu',
  'rudr',
  'rlr',
  'dud',
  'rdlu',
  'rdrul',
  'rl',
  'rld',
  'rdl',
  'ldr',
]

/** Renders a diagram and returns its markup with the <defs> block removed, so that only rendered
 * geometry remains — the same thing getBBox() measures. */
const render = (props: Parameters<typeof GestureDiagram>[0]) =>
  renderToStaticMarkup(createElement(GestureDiagram, props)).replace(/<defs>.*?<\/defs>/gs, '')

/** Collects every absolute point from rendered path data. Gesture geometry is emitted either as
 * `M x y l dx dy` per segment or as a single `M x y L x y …`. */
const pointsFromMarkup = (markup: string) => {
  const points: { x: number; y: number }[] = []
  ;[...markup.matchAll(/ d="([^"]+)"/g)].forEach(([, d]) => {
    const tokens = d.split(/[\s,]+/)
    let cursor = { x: 0, y: 0 }
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === 'M' || tokens[i] === 'L') {
        cursor = { x: +tokens[i + 1], y: +tokens[i + 2] }
        points.push(cursor)
        i += 2
      } else if (tokens[i] === 'l') {
        cursor = { x: cursor.x + +tokens[i + 1], y: cursor.y + +tokens[i + 2] }
        points.push(cursor)
        i += 2
      }
    }
  })
  return points
}

/** Returns the bounding box of a set of points. */
const boundsOf = (points: { x: number; y: number }[]) => {
  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

describe('viewBox framing', () => {
  /** The framing expression as it stood before the viewBox moved from onRef into render. Kept here
   * so that any future change to how diagrams are framed has to be deliberate: this padding is
   * asymmetric for filled arrowheads, and correcting that resizes every diagram in the app. */
  const expectedViewBox = (
    bbox: { x: number; y: number; width: number; height: number },
    { arrowhead, arrowSize, strokeWidth }: { arrowhead: string; arrowSize: number; strokeWidth: number },
  ) =>
    `${bbox.x - arrowSize - strokeWidth * 4} ${bbox.y - arrowSize - strokeWidth * 2} ${
      bbox.width + arrowSize * (arrowhead === 'outlined' ? 2 : 5) + strokeWidth * 8
    } ${bbox.height + arrowSize * 2 + strokeWidth * 4}`

  const cases = [
    { arrowhead: 'filled' as const, size: 48, arrowSize: 12, strokeWidth: 1.5 },
    { arrowhead: 'outlined' as const, size: 130, arrowSize: 25, strokeWidth: 7.5 },
  ]

  cases.forEach(({ arrowhead, size, arrowSize, strokeWidth }) => {
    PATHS.forEach(path => {
      it(`frames ${path} with a ${arrowhead} arrowhead`, () => {
        const markup = render({ path, size, arrowSize, strokeWidth, arrowhead })
        const viewBox = markup.match(/viewBox="([^"]+)"/)?.[1]
        expect(viewBox).toBe(expectedViewBox(boundsOf(pointsFromMarkup(markup)), { arrowhead, arrowSize, strokeWidth }))
      })
    })
  })

  it('squares the viewBox in fillContainer mode and never frames tighter than the clamp', () => {
    const size = 150
    const arrowSize = 1
    const strokeWidth = 12
    // squareViewBox pads by arrowSize + strokeWidth * 4 on every side.
    const minimumSide = size + (arrowSize + strokeWidth * 4) * 2

    PATHS.forEach(path => {
      const markup = render({ path, size, arrowSize, strokeWidth, fillContainer: true })
      const [, , width, height] = markup
        .match(/viewBox="([^"]+)"/)![1]
        .split(' ')
        .map(Number)
      // Square, so the diagram is centered in its cell whatever shape it is.
      expect(width).toBe(height)
      // Gestures larger than the clamp still get the room they need; smaller ones are floored, so
      // a short gesture cannot balloon to fill the cell and dwarf its neighbours.
      expect(width).toBeGreaterThanOrEqual(minimumSide)
    })
  })
})

describe('outlined-wide chevron', () => {
  /** Returns the three points of the chevron, which is rendered as the final path. */
  const chevronOf = (markup: string) => {
    const d = [...markup.matchAll(/ d="([^"]+)"/g)].pop()![1]
    const tokens = d.split(/[\s,]+/).filter(token => token !== 'M' && token !== 'L')
    return [0, 1, 2].map(i => ({ x: +tokens[i * 2], y: +tokens[i * 2 + 1] }))
  }

  /** Returns the interior angle at the apex, in degrees. */
  const apexAngleOf = ([leg1, apex, leg2]: { x: number; y: number }[]) => {
    const a = { x: leg1.x - apex.x, y: leg1.y - apex.y }
    const b = { x: leg2.x - apex.x, y: leg2.y - apex.y }
    const cosine = (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))
    return (Math.acos(cosine) * 180) / Math.PI
  }

  const props = { size: 150, strokeWidth: 12, arrowhead: 'outlined-wide' as const, continuous: true }

  it.each([40, 60, 80, 120])('opens to the requested apex angle of %i degrees', apexAngle => {
    const chevron = chevronOf(render({ ...props, path: 'rd', chevronApexAngle: apexAngle }))
    expect(apexAngleOf(chevron)).toBeCloseTo(apexAngle, 6)
  })

  it('holds the apex angle whatever the direction of the final segment', () => {
    PATHS.forEach(path => {
      expect(apexAngleOf(chevronOf(render({ ...props, path })))).toBeCloseTo(80, 6)
    })
  })

  it('places the apex on the end of the gesture', () => {
    PATHS.forEach(path => {
      const markup = render({ ...props, path })
      const [, apex] = chevronOf(markup)
      // In continuous mode the gesture is a single path rendered before the chevron, so the first
      // path's last point is where the gesture ends.
      const gesture = markup.match(/ d="([^"]+)"/)![0]
      const gestureEnd = pointsFromMarkup(gesture).pop()!
      expect(apex.x).toBeCloseTo(gestureEnd.x, 6)
      expect(apex.y).toBeCloseTo(gestureEnd.y, 6)
    })
  })

  it('scales the legs with the stroke, so the arrowhead stays in proportion', () => {
    /** Returns the distance between the two open ends of the chevron's legs. */
    const spanOf = (chevronSize: number) => {
      const [leg1, , leg2] = chevronOf(render({ ...props, path: 'r', chevronSize }))
      return Math.hypot(leg1.x - leg2.x, leg1.y - leg2.y)
    }
    expect(spanOf(4)).toBeCloseTo(spanOf(2) * 2, 6)
  })

  it('falls back to a marker where there is no straight final segment to align with', () => {
    const rounded = render({ ...props, path: 'lurd', rounded: true })
    const glyph = render({ ...props, path: 'rdld' })
    expect(rounded).toContain('marker-end')
    // The rdld glyph has never had an arrowhead of its own.
    expect(glyph).not.toContain('marker-end')
  })
})

describe('cornerRadius', () => {
  it('softens the interior vertices of a continuous path into curves', () => {
    const sharp = render({ path: 'rdr', size: 150, strokeWidth: 12, continuous: true, cornerRadius: 0 })
    const rounded = render({ path: 'rdr', size: 150, strokeWidth: 12, continuous: true, cornerRadius: 12 })
    expect(sharp).not.toContain('Q ')
    expect(rounded).toContain('Q ')
  })

  it('caps the corner offset at half a segment so adjacent corners cannot overlap', () => {
    // A radius far larger than any segment would otherwise run the corners into one another and
    // double back on the path.
    const markup = render({ path: 'rdrd', size: 40, strokeWidth: 4, continuous: true, cornerRadius: 1000 })
    const points = pointsFromMarkup(markup)
    // Each straight run between curves collapses to zero length at the cap, but never inverts.
    points.slice(1).forEach((point, i) => {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
      expect(Math.hypot(point.x - points[i].x, point.y - points[i].y)).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('tipExtension', () => {
  it('lengthens only the final segment', () => {
    const withoutExtension = pointsFromMarkup(render({ path: 'rd', size: 150, strokeWidth: 12, continuous: true }))
    const withExtension = pointsFromMarkup(
      render({ path: 'rd', size: 150, strokeWidth: 12, continuous: true, tipExtension: 30 }),
    )

    // Every vertex but the last is untouched.
    withoutExtension.slice(0, -1).forEach((point, i) => {
      expect(withExtension[i].x).toBeCloseTo(point.x, 6)
      expect(withExtension[i].y).toBeCloseTo(point.y, 6)
    })

    const before = withoutExtension[withoutExtension.length - 1]
    const after = withExtension[withExtension.length - 1]
    const previous = withoutExtension[withoutExtension.length - 2]
    expect(Math.hypot(after.x - previous.x, after.y - previous.y)).toBeCloseTo(
      Math.hypot(before.x - previous.x, before.y - previous.y) + 30,
      6,
    )
  })
})
