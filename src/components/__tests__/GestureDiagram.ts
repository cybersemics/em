import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import GestureDiagram from '../GestureDiagram'

/** Renders a gesture diagram to static SVG markup. */
const render = (props: Parameters<typeof GestureDiagram>[0]) =>
  renderToStaticMarkup(createElement(GestureDiagram, props))

/** Returns the path data rendered outside the defs block. */
const renderedPathData = (markup: string) =>
  [...markup.replace(/<defs>.*?<\/defs>/gs, '').matchAll(/ d="([^"]+)"/g)].map(([, pathData]) => pathData)

describe('GestureDiagram rendering modes', () => {
  it('renders a solid gesture as one combined path', () => {
    const markup = render({ path: 'rdr', size: 100, arrowhead: 'none', useGradient: false })

    expect(renderedPathData(markup)).toEqual(['M 0 0 L 50 0 L 50 50 L 100 50'])
  })

  it('splits a partially highlighted solid gesture at the semantic segment boundary', () => {
    const markup = render({ path: 'rdr', size: 100, arrowhead: 'none', useGradient: false, highlight: 1 })

    expect(renderedPathData(markup)).toEqual(['M 0 0 L 50 0', 'M 50 0 L 50 50 L 100 50'])
  })

  it('keeps synthetic geometry with the semantic direction it extends', () => {
    const markup = render({ path: 'rdl', size: 100, arrowhead: 'none', useGradient: false, highlight: 2 })

    expect(renderedPathData(markup)).toEqual(['M 0 0 L 50 0 L 50 50 L 50 100', 'M 50 100 L 0 100'])
  })

  it('preserves the rdld Bezier geometry in solid mode', () => {
    const markup = render({ path: 'rdld', arrowhead: 'none', useGradient: false })

    expect(renderedPathData(markup)).toEqual([
      'M 29.7,13.5 Q 46.8,-4.5 63,13.5 Q 72,27 54,40.5 Q 45,49.5 45,58.5 L 45,72',
    ])
  })

  it('preserves segmented gradients when no custom ramp is supplied', () => {
    const markup = render({ path: 'rdl', arrowhead: 'none' })

    expect(renderedPathData(markup)).toHaveLength(4)
    expect(markup).toContain('rddl-gradient-3')
    expect(markup).not.toContain('-piece-3-color')
  })

  it('paints partial continuous-gradient highlighting as a solid semantic prefix', () => {
    const markup = render({
      path: 'rdl',
      size: 100,
      arrowhead: 'none',
      highlight: 2,
      gradient: { from: '#111', to: '#eee' },
    })

    expect(renderedPathData(markup).at(-1)).toBe('M 0 0 L 50 0 L 50 50 L 50 100')
  })
})

describe('continuous path-length gradient', () => {
  const props = { size: 150, strokeWidth: 12, arrowhead: 'none' as const }
  const gradient = { from: '#111', to: '#eee' }

  /** Returns the color stops of every visible gradient piece. */
  const gradientStops = (markup: string) =>
    [
      ...markup.matchAll(
        /<linearGradient id="[^"]+-piece-\d+-color"[^>]*>.*?stop-color:([^;"]+).*?stop-color:([^;"]+).*?<\/linearGradient>/gs,
      ),
    ].map(([, start, end]) => ({ start: start.trim(), end: end.trim() }))

  /** Extracts the percentage of the end color from a color-mix value. */
  const mixOf = (color: string) => +color.match(/ ([\d.]+)%/)![1]

  it('spends the whole ramp along a gesture whose end is close to its start', () => {
    const stops = gradientStops(render({ ...props, path: 'rdlu', gradient }))

    expect(stops.length).toBeGreaterThan(1)
    expect(mixOf(stops[0].start)).toBe(0)
    expect(mixOf(stops.at(-1)!.end)).toBe(100)
  })

  it('blends across the complete gesture by default', () => {
    const stops = gradientStops(render({ ...props, path: 'rd', gradient }))

    expect(stops).toHaveLength(2)
    expect(mixOf(stops[0].end)).toBe(50)
  })

  it('uses a luminance mask so translucent piece caps do not accumulate alpha', () => {
    const markup = render({
      ...props,
      path: 'rd',
      gradient: { from: 'rgba(88, 181, 212, 0.45)', to: '#fff' },
    })

    expect(markup).toContain('mask-type:luminance')
    expect(markup).toContain('color-interpolation:sRGB')
    expect(markup).toContain('color(from rgba(88, 181, 212, 0.45) srgb alpha alpha alpha / 1)')
  })

  it('flattens canonical arcs and quadratics without shape-specific gradient routines', () => {
    const roundedStops = gradientStops(render({ ...props, path: 'lurd', gradient, rounded: true }))
    const glyphStops = gradientStops(render({ ...props, path: 'rdld', gradient }))

    expect(roundedStops.length).toBeGreaterThan(20)
    expect(glyphStops.length).toBeGreaterThan(20)
  })
})

describe('gesture shape', () => {
  const gradient = { from: '#111', to: '#eee' }

  /** Parses the coordinates from a path containing only move and line commands. */
  const pointsOf = (pathData: string) => {
    const values = pathData.match(/-?[\d.]+/g)!.map(Number)
    return Array.from({ length: values.length / 2 }, (_, index) => ({
      x: values[index * 2],
      y: values[index * 2 + 1],
    }))
  }

  it('samples softened corners into additional gradient pieces', () => {
    const sharp = render({ path: 'rdr', gradient, arrowhead: 'none' })
    const soft = render({ path: 'rdr', gradient, arrowhead: 'none', cornerRadius: 5 })

    expect(soft.match(/-piece-\d+-color/g)!.length).toBeGreaterThan(sharp.match(/-piece-\d+-color/g)!.length)
  })

  it('draws an outlined-wide chevron at the requested apex angle', () => {
    const markup = render({
      path: 'rdr',
      gradient,
      arrowhead: 'outlined-wide',
      chevronApexAngle: 60,
      chevronSize: 2.2,
    })
    const chevron = pointsOf(renderedPathData(markup).at(-1)!)
    const [leg1, apex, leg2] = chevron
    const a = { x: leg1.x - apex.x, y: leg1.y - apex.y }
    const b = { x: leg2.x - apex.x, y: leg2.y - apex.y }
    const cosine = (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))

    expect(markup).not.toContain('marker-end')
    expect((Math.acos(cosine) * 180) / Math.PI).toBeCloseTo(60)
  })

  it('keeps the rdld glyph arrowhead-free', () => {
    const markup = render({ path: 'rdld', gradient, arrowhead: 'outlined-wide' })
    const gradientPieceCount = [...markup.matchAll(/<linearGradient id="[^"]+-piece-\d+-color"/g)].length

    expect(markup).not.toContain('marker-end')
    expect(renderedPathData(markup)).toHaveLength(gradientPieceCount)
  })
})
