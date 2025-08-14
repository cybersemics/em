import { page } from '../setup'

/**
 * Waits until the currently editing thought in the DOM matches the given value and, if provided, the selection offset matches.
 */
const waitForSelectionNode = async (value: string, offset?: number, timeout: number = 6000) => {
  await page.waitForFunction(
    (value: string, offset?: number) => {
      const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement | null
      if (!editable) return false

      const matchesDomValue = editable.textContent === value

      const selection = window.getSelection()
      const selectionInEditable = !!selection?.focusNode && editable.contains(selection.focusNode)
      const focusNodeType = window.getSelection()?.focusNode?.nodeType

      const matchesOffset =
        offset == null
          ? true
          : selectionInEditable &&
            (focusNodeType === Node.TEXT_NODE || offset === 0
              ? selection?.focusOffset === offset
              : selection?.focusOffset === 1)

      return matchesDomValue && matchesOffset
    },
    { timeout },
    value,
    offset,
  )
}

export default waitForSelectionNode
