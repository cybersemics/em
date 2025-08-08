import { page } from '../setup'

/**
 * Waits for a given number of animation frames to ensure complete rendering.
 *
 * This technique guarantees:
 * 1. All pending `requestAnimationFrame` callbacks execute.
 * 2. Resulting DOM updates process through style/layout/paint.
 * 3. Browser reaches stable visual state for screenshots.
 *
 * Essential for eliminating flaky tests where:
 * - Components use rAF for state updates.
 * - CI environments have slower frame rates (20-30 FPS vs local 60 FPS).
 * - Fixed timeouts (e.g., `sleep(200)`) fail to capture final render.
 */
const waitForFrames = (count: number = 1): Promise<void> => {
  return page.evaluate(async (n: number) => {
    for (let i = 0; i < n; i++) {
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve())
      })
    }
  }, count)
}

export default waitForFrames
