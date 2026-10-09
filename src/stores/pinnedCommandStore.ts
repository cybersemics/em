import reactMinistore from './react-ministore'

/**
 * Transient state of the pinned command widget that code outside React needs. The gesture handlers read tooltipOpen
 * to keep the gesture menu from opening over the tooltip while the user practices the gesture it shows.
 */
const pinnedCommandStore = reactMinistore({
  /** Whether the pinned command tooltip is expanded. */
  tooltipOpen: false,
})

export default pinnedCommandStore
