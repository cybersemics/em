import { page } from '../session'

/** Returns true if any of the text nodes the selection spanned when watchSelection was called has been removed from
 * the document, i.e. the selection was destroyed and re-created rather than preserved. Throws if watchSelection was
 * not called. */
const selectionWasDropped = () =>
  page.evaluate(() => {
    const watched = window as typeof window & { __watchedSelectionNodes?: Node[] }
    if (!watched.__watchedSelectionNodes?.length) {
      throw new Error('The selection is not being watched. Call watchSelection first.')
    }
    return watched.__watchedSelectionNodes.some(node => !node.isConnected)
  })

export default selectionWasDropped
