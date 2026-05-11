import waitForElement from './waitForElement'

/** Click a node by selector or element with WebDriver click or synthetic DOM clicks. */
const click = async (selector: string) => {
  const el = await waitForElement(selector)
  const rect = await browser.getElementRect(el.elementId)

  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  await browser
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ x: Math.round(centerX), y: Math.round(centerY), origin: 'viewport' })
    .down()
    .up()
    .perform()
}

export default click
