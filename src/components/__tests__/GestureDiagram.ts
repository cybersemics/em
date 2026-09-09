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
