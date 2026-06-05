import type { WindowEm } from '../../../initialize'
import { page } from '../setup'
import waitForEmIdle from './waitForEmIdle'

// Match waitForEditable's default: parallel Puppeteer runs can make browser round trips exceed 1s.
const editableReadyTimeout = 6000

/** Ensures typed text goes to the current thought when mobile gesture commands leave focus on body. */
const focusEditingElementIfNeeded = async (): Promise<void> => {
  const editingSelector = '[data-editing=true] [data-editable], [data-editable][data-editing=true]'

  await page.waitForFunction(
    selector => {
      const active = document.activeElement as HTMLElement | null
      return (
        (active &&
          (active.hasAttribute('data-editable') ||
            active.getAttribute('aria-label') === 'note-editable' ||
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA')) ||
        document.querySelector(selector)
      )
    },
    { timeout: editableReadyTimeout },
    editingSelector,
  )

  await page.evaluate(selector => {
    const active = document.activeElement as HTMLElement | null
    if (
      active &&
      (active.hasAttribute('data-editable') ||
        active.getAttribute('aria-label') === 'note-editable' ||
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA')
    ) {
      return
    }

    const editable = document.querySelector(selector)
    if (!(editable instanceof HTMLElement)) return

    editable.focus()
    const range = document.createRange()
    range.selectNodeContents(editable)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, editingSelector)
}

/** Type text on the keyboard. To press a key (optionally with modifiers), see the press helper. */
const keyboard = {
  // export keyboard object because 'type' is a reserved word and cannot be used as a function name
  type: async (text: string) => page.keyboard.type(text),
}

export default keyboard
