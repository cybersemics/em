import { page } from '../session'
import waitForEditable from './waitForEditable'

/** Waits for upward scrolling to move a thought smoothly through four consecutive subpixel steps. */
const waitForSmoothScroll = async (value: string) => {
  const thought = await waitForEditable(value)
  const motion = await page.evaluateHandle(() => ({ previousTop: null as number | null, delta: 0, smoothSteps: 0 }))
  try {
    await page.waitForFunction(
      (thought, motion) => {
        if (!thought) throw new Error('Missing thought while observing scrolling.')
        const top = thought.getBoundingClientRect().top
        motion.delta = motion.previousTop === null ? 0 : motion.previousTop - top
        motion.smoothSteps = motion.delta > 0 && motion.delta < 0.75 ? motion.smoothSteps + 1 : 0
        motion.previousTop = top
        return motion.smoothSteps >= 4
      },
      { timeout: 5000 },
      thought,
      motion,
    )
  } catch {
    const observed = await motion.jsonValue()
    throw new Error(`Scrolling ${value} did not move smoothly; the last frame moved ${observed.delta}px.`)
  } finally {
    await motion.dispose()
    await thought.dispose()
  }
}

export default waitForSmoothScroll
