import { page } from '../session'

/** Selects a word within one text node of the editing thought, as a native double tap does. */
const selectWord = async (word: string): Promise<void> => {
  await page.evaluate(word => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    if (!editable) throw new Error('No editing thought found')

    const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node && !node.textContent?.includes(word)) node = walker.nextNode()
    if (!node) throw new Error(`Word "${word}" not found in the editing thought`)

    const range = document.createRange()
    const start = node.textContent!.indexOf(word)
    range.setStart(node, start)
    range.setEnd(node, start + word.length)
    const selection = window.getSelection()
    if (!selection) throw new Error('Browser selection is unavailable')
    selection.removeAllRanges()
    selection.addRange(range)
  }, word)
}

export default selectWord
