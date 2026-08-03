import { page } from '../session'

/** Records the text nodes the browser selection currently spans, so that selectionWasDropped can report whether a
 * subsequent action preserved the selection or destroyed and re-created it. Throws if there is no selection to watch. */
const watchSelection = () =>
  page.evaluate(() => {
    const watched = window as typeof window & { __watchedSelectionNodes?: Node[] }
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      throw new Error('There is no selection to watch.')
    }
    const range = selection.getRangeAt(0)
    const root = range.commonAncestorContainer
    if (root.nodeType === Node.TEXT_NODE) {
      watched.__watchedSelectionNodes = [root]
      return
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes: Node[] = []
    while (walker.nextNode()) {
      if (range.intersectsNode(walker.currentNode)) nodes.push(walker.currentNode)
    }
    watched.__watchedSelectionNodes = nodes
  })

export default watchSelection
