import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import GestureDiagram from '../../../components/GestureDiagram'
import { page } from '../session'

/** Renders production gesture markup on an isolated white page for browser paint assertions. Requires explicit framing. */
const renderGestureDiagram = async (props: Parameters<typeof GestureDiagram>[0]) => {
  if (!props.viewBox) throw new Error('Static gesture rendering requires an explicit viewBox.')

  const markup = renderToStaticMarkup(createElement(GestureDiagram, props))
  await page.goto('about:blank')
  await page.setContent(`<body style="margin: 0; background: white">${markup}</body>`)
  await page.waitForSelector('svg')
}

export default renderGestureDiagram
