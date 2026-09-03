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

  it('preserves the rdld Bezier geometry in solid mode', () => {
    const markup = render({ path: 'rdld', arrowhead: 'none', useGradient: false })

    expect(renderedPathData(markup)).toEqual([
      'M 29.7,13.5 Q 46.8,-4.5 63,13.5 Q 72,27 54,40.5 Q 45,49.5 45,58.5 L 45,72',
    ])
  })

  it('renders gradients as one path per extended segment', () => {
    const markup = render({ path: 'rdl', arrowhead: 'none' })

    expect(renderedPathData(markup)).toHaveLength(4)
    expect(markup).toContain('rddl-gradient-3')
  })
})
