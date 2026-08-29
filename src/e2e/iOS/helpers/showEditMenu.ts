interface ShowEditMenuOptions {
  /**
   * Milliseconds to let WebKit lay out the selection before tapping. A freshly-changed selection isn't
   * tappable immediately — tapping too soon lands before the selection settles and no menu appears.
   */
  settleMs?: number
}

/**
 * Summon the native iOS edit menu (`Cut | Copy | Paste`) for the *current* selection by tapping once on
 * it. The menu is driven by WebKit's touch recognizers, not by DOM mutations, so a programmatic selection
 * (e.g. from `setSelection`) shows handles but no menu until a touch lands on it; a single tap presents
 * the menu without collapsing the selection.
 *
 * Uses only `mobile: tap`, so it works on both Appium 2 and Appium 3 — no legacy `/touch/perform`.
 * Assumes a non-collapsed selection exists and the WKWebView context is active. Note the native menu is
 * native UI (not in the DOM), so this helper performs the tap but cannot itself assert the menu appeared;
 * verify with a native screenshot when needed.
 *
 * Uses the global `browser` object from WDIO.
 */
const showEditMenu = async ({ settleMs = 500 }: ShowEditMenuOptions = {}): Promise<void> => {
  const raw = await browser.execute(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return JSON.stringify({ error: 'No active (non-collapsed) selection to show the edit menu for.' })
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect()
    return JSON.stringify({ cx: Math.round(rect.x + rect.width / 2), cy: Math.round(rect.y + rect.height / 2) })
  })

  const target = JSON.parse(raw) as { cx: number; cy: number; error?: string }
  if (target.error) throw new Error(target.error)

  await browser.pause(settleMs)
  await browser.execute('mobile: tap', { x: target.cx, y: target.cy })
}

export default showEditMenu
export type { ShowEditMenuOptions }
