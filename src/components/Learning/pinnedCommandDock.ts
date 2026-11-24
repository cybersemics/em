import { css } from '../../../styled-system/css'

/**
 * Where the pinned command ring docks: fixed to the screen's bottom-right corner, so it stays put however the page
 * scrolls, including over the footer at the end of the page. Shared by the ring itself (PinnedCommand) and by Command
 * Discovery, whose genie lands in the ring and which shows an empty ring there when no command is pinned.
 */
const pinnedCommandDock = css({
  position: 'fixed',
  right: 0,
  // The ring center sits 13.5px above the NavBar's bottom edge; its box center is 36.16px above its bottom.
  bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) - 22.5px)',
  pointerEvents: 'none',
})

export default pinnedCommandDock
