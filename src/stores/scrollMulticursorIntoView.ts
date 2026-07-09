import reactMinistore from './react-ministore'

/**
 * Pulse store that signals the layout to scroll the topmost selected thought into view.
 *
 * It is incremented after a multicursor formatting command completes (see the formatting commands' multicursor.onComplete).
 * The actual scroll is performed in LayoutTree, which is the only place that has the positioned thoughts (y/height).
 * See #3995.
 */
const scrollMulticursorIntoViewStore = reactMinistore(0)

/** A multicursor onComplete handler that triggers a scroll of the topmost selected thought into view (only if it is offscreen). Used by the formatting commands. */
export const scrollMulticursorIntoViewOnComplete = () => {
  scrollMulticursorIntoViewStore.update(n => n + 1)
}

export default scrollMulticursorIntoViewStore
