/** Id of the style element that disables transitions, so a second call replaces it rather than stacking. */
const STYLE_ID = 'disable-transitions'

/**
 * Disable CSS transitions for the rest of the page's life. BrowserStack devices run them at full duration, so an
 * element that has just rendered may still be sliding into place, and a tap aimed at its rect lands on whatever has
 * moved under it. Use it in tests that are not about the transitions themselves. The page reload in resetApp
 * restores them for the next test.
 */
const disableTransitions = async (): Promise<void> => {
  await browser.execute((id: string) => {
    document.getElementById(id)?.remove()
    const style = document.createElement('style')
    style.id = id
    style.textContent = '*, *::before, *::after { transition: none !important; }'
    document.head.appendChild(style)
  }, STYLE_ID)
}

export default disableTransitions
