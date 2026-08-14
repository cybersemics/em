import viewportStore from '../../stores/viewport'
import { SIDEBAR_WIDTH_PX } from './constants'

/**
 * Responsive drawer sizing: fixed on large devices (so the main content stays partially
 * visible), full-viewport on small screens. Returns both the real pixel width — for the
 * arithmetic that positions and clamps the drawer — and the CSS value to render it at.
 */
const useDrawerWidth = (isLargeDevice: boolean) => {
  /** Current viewport width from the viewport store – used on small screens, where the
   * drawer's CSS width is fluid ('100%') rather than a fixed pixel value. */
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  const width = isLargeDevice ? SIDEBAR_WIDTH_PX : innerWidth
  const widthAsCssString = isLargeDevice ? `${SIDEBAR_WIDTH_PX}px` : '100%'

  return { width, widthAsCssString }
}

export default useDrawerWidth
