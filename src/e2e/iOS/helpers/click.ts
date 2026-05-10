import tap from './tap'
import waitForElement from './waitForElement'

export type ClickOptions = {
  /**
   * Dispatch `mousedown` / `mouseup` / `click` in the page with `dispatchEvent` instead of WebDriver click.
   * WebDriver clicks move native focus onto the toolbar or popover, which blurs the note and clears
   * `noteFocus` before formatting runs. Use on toolbar Text Color and color swatches while editing a note.
   */
  preserveActiveFocus?: boolean
}

/** Click a node by selector or element with synthetic DOM clicks. */
const dispatchSyntheticClick = (sel: string) => {
  const target = document.querySelector(sel)
  if (!(target instanceof HTMLElement)) {
    throw new Error(`preserveActiveFocus: no HTMLElement for selector: ${sel}`)
  }
  const o = { bubbles: true, cancelable: true, view: window }
  target.dispatchEvent(new MouseEvent('mousedown', o))
  target.dispatchEvent(new MouseEvent('mouseup', o))
  target.dispatchEvent(new MouseEvent('click', o))
}

/** Click a node by selector or element with WebDriver click or synthetic DOM clicks. */
const click = async (selector: string, options: ClickOptions = {}) => {
  const { preserveActiveFocus = false } = options
  const el = await waitForElement(selector, { timeout: 10000 })

  if (!el) throw new Error(`editable node for the given selector(${selector}) not found.`)

  if (preserveActiveFocus) {
    await browser.execute(dispatchSyntheticClick, selector)
  } else {
    // Prefer WebDriver Element Click for UI controls (menu/toolbar/swatches).
    // It is more reliable in iOS Safari WebView for dispatching a real DOM click.
    // Fall back to coordinate tap only when element click fails.
    try {
      await el.waitForClickable({ timeout: 10000 })
      await el.click()
    } catch {
      await tap(el)
    }
  }
}

export default click
