import { page } from '../setup'

/**
 * Waits for consecutive animation frames to ensure complete rendering.
 *
 * This technique guarantees:
 * 1. All pending `requestAnimationFrame` callbacks execute (first frame).
 * 2. Resulting DOM updates process through style/layout/paint (second frame).
 * 3. Browser reaches stable visual state for screenshots.
 *
 * Essential for eliminating flaky tests where:
 * - Components use rAF for state updates (e.g., Superscript calculations).
 * - CI environments have slower frame rates (20-30 FPS vs local 60 FPS).
 * - Fixed timeouts (e.g., `sleep(200)`) fail to capture final render.
 *
 * @param frames Number of animation frames to wait (default: 2). Use higher values for complex layouts like multiline text.
 */
const waitForFrames = (frames: number = 2) =>
  page.evaluate((frameCount: number) => {
    return new Promise(resolve => {
      let count = 0
      /** Function to be called on each frame. */
      function nextFrame() {
        requestAnimationFrame(() => {
          count++
          if (count >= frameCount) {
            resolve(undefined)
          } else {
            nextFrame()
          }
        })
      }
      nextFrame()
    })
  }, frames)

export default waitForFrames
