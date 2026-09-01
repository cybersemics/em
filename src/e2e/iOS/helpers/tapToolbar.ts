import type CommandLabel from '../../../@types/CommandLabel'
import tap from './tap.js'
import waitForElement from './waitForElement.js'

/** Options shared by the button tap and the dropdown value tap.
 *
 * ToolbarButton binds onTouchStart/onTouchEnd when isTouch and onMouseDown/onClick otherwise, so the toolbar is only
 * reachable with a touch pointer on a device; tap's 'mouse' default never fires the command. A touch pointer also keeps
 * the caret where it is, since ToolbarButton preventDefaults touchend to suppress the blur (a mouse tap blurs the
 * editable, which for a note clears `noteFocus` before the command runs). The y offset is the Safari chrome offset used
 * throughout this suite, since tap reads page coordinates but taps in screen coordinates.
 */
export const toolbarTapOptions = { y: 60, pointerType: 'touch' } as const

/**
 * Tap a toolbar button by its label, and optionally a value in the dropdown that it opens, e.g. `tapToolbar('Bold')` or `tapToolbar('Text Color', 'background color swatches', 'blue')`.
 *
 * A picker is rendered inside the toolbar button that opens it (see TextColorWithColorPicker), so values are matched by aria-label within the button. Nested values are given as a path, which is required when a value is ambiguous on its own, e.g. the Text Color dropdown contains both a text and a background swatch labeled "blue", so `tapToolbar('Text Color', 'background color swatches', 'blue')`.
 */
const tapToolbar = async (label: CommandLabel, ...values: string[]) => {
  const toolbarSelector = `[data-testid="toolbar-icon"][aria-label="${label}"]`
  const button = await waitForElement(toolbarSelector)

  // The toolbar scrolls horizontally and most of its buttons start off-screen, so tapping the button's reported rect
  // would land outside the viewport and silently do nothing. Center it rather than scrolling it just far enough,
  // since the toolbar's edges are overlapped by opaque scroll arrows that would swallow the tap.
  await browser.execute((selector: string) => {
    // 'instant' matters: ToolbarButton reads the toolbar's scrollLeft at touchstart and again at touchend, and treats
    // a change of 5px or more as a swipe that suppresses the command. A smooth scroll still animating when the tap
    // lands would look exactly like that swipe.
    // 'nearest' keeps the page from scrolling vertically, which the #3999 test asserts does not happen.
    document.querySelector(selector)!.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' })
  }, toolbarSelector)

  await tap(button, toolbarTapOptions)

  if (values.length === 0) return

  const valueSelector = `${toolbarSelector} ${values.map(value => `[aria-label="${value}"]`).join(' ')}`
  const valueElement = await waitForElement(valueSelector)

  // A value that matches more than one element would silently resolve to whichever comes first in the DOM, so require the caller to name the group that contains it.
  const groups = await browser.execute(
    (selector: string) =>
      Array.from(document.querySelectorAll(selector)).map(element =>
        element.parentElement?.closest('[aria-label]')?.getAttribute('aria-label'),
      ),
    valueSelector,
  )
  if (groups.length > 1) {
    const value = values[values.length - 1]
    throw new Error(
      `"${value}" matches ${groups.length} elements in the "${label}" dropdown. Name the group that contains it, e.g. tapToolbar('${label}', '${groups[0]}', '${value}').`,
    )
  }

  await tap(valueElement, toolbarTapOptions)
}

export default tapToolbar
