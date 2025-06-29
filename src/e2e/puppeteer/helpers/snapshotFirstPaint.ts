import { ScreenshotOptions } from 'puppeteer'
import { page } from '../setup'

/**
 * Captures a screenshot after the first animation frame following a user interaction.
 *
 * This utility is designed to capture the initial state of animations triggered by user interactions,
 * providing test coverage for animation behaviors without waiting for animations to complete.
 *
 * The first frame after a user interaction is typically deterministic and should be suitable
 * for CI environments, unlike waiting for animation completion which can vary with frame rates.
 *
 * @param interactionFn - A function that performs the user interaction (e.g., click, key press).
 * @param options - Optional screenshot options.
 * @returns Promise<Buffer> - Screenshot buffer of the first paint after interaction.
 *
 * @example
 * ```typescript
 * // Capture first frame of animation after clicking a button
 * const screenshot = await snapshotFirstPaint(async () => {
 *   await click('[data-testid="expand-button"]')
 * })
 * expect(screenshot).toMatchImageSnapshot()
 * ```
 */
const snapshotFirstPaint = async (interactionFn: () => Promise<void>, options?: ScreenshotOptions): Promise<Buffer> => {
  // Perform the user interaction
  await interactionFn()

  // Wait for exactly one animation frame after the interaction
  // This captures the first paint of any animations that were triggered
  await page.evaluate(() => {
    return new Promise(resolve => {
      requestAnimationFrame(resolve)
    })
  })

  // Take screenshot of the first paint
  return Buffer.from(await page.screenshot(options))
}

/**
 * Captures multiple snapshots showing the progression of animation frames.
 * This is useful for testing animation sequences and ensuring they progress correctly.
 *
 * @param interactionFn - A function that performs the user interaction.
 * @param frameCount - Number of animation frames to capture (default: 3).
 * @param options - Optional screenshot options.
 * @returns Promise<Buffer[]> - Array of screenshot buffers for each frame.
 *
 * @example
 * ```typescript
 * // Capture first 3 frames of animation
 * const frames = await snapshotAnimationFrames(async () => {
 *   await click('[data-testid="expand-button"]')
 * })
 * frames.forEach((frame, i) => {
 *   expect(frame).toMatchImageSnapshot({ customSnapshotIdentifier: `frame-${i}` })
 * })
 * ```
 */
const snapshotAnimationFrames = async (
  interactionFn: () => Promise<void>,
  frameCount = 3,
  options?: ScreenshotOptions,
): Promise<Buffer[]> => {
  // Perform the user interaction
  await interactionFn()

  const frames: Buffer[] = []

  // Capture multiple animation frames
  for (let i = 0; i < frameCount; i++) {
    await page.evaluate(() => {
      return new Promise(resolve => {
        requestAnimationFrame(resolve)
      })
    })
    frames.push(Buffer.from(await page.screenshot(options)))
  }

  return frames
}

export default snapshotFirstPaint
export { snapshotAnimationFrames }
