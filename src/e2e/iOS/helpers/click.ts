import waitForElement from './waitForElement'

/** Click a node by selector or element with WebDriver click or synthetic DOM clicks. */
const click = async (selector: string) => {
  const el = await waitForElement(selector)
  const rect = await browser.getElementRect(el.elementId)

  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: Math.round(centerX), y: Math.round(centerY), origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

export default click
