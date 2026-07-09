import type { WindowEm } from '../../../initialize'

/**
 * Restores the window scroll position after a native touch action.
 * A delayed scroll from `useScrollCursorIntoView` can override the restored position,
 * so it is cancelled before restoring.
 */
const restoreScroll = async (scrollBefore: { x: number; y: number }) => {
  // On iOS Safari, restoring to `scrollY = 0` does not work because the app keeps the scroll position at least `1` as a workaround for touch scrolling issues.
  const target = { x: scrollBefore.x, y: Math.max(1, scrollBefore.y) }

  await browser.execute(({ x, y }) => {
    const em = window.em as WindowEm
    em.testFlags.throttledScrollCursorIntoView?.cancel()
    window.scrollTo(x, y)
  }, target)

  await browser.waitUntil(
    async () => {
      const current = await browser.execute(() => ({ x: window.scrollX, y: window.scrollY }))
      return current.x === target.x && current.y === target.y
    },
    { timeout: 3000, timeoutMsg: 'Failed to restore scroll position' },
  )
}

export default restoreScroll
