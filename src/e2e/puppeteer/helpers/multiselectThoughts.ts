import { isMac } from '../../../browser'
import { page } from '../setup'
import clickThought from './clickThought'

/** Multiselect thoughts by holding Cmd/Ctrl and clicking them.*/
const multiselectThoughts = async (
  values: string | string[],
  options: {
    /** Keep modifier key held after multiselect (useful for chaining operations). */
    keepModifierHeld?: boolean
  } = {},
) => {
  const { keepModifierHeld = false } = options
  const thoughtValues = Array.isArray(values) ? values : [values]

  const modifierKey = isMac ? 'Meta' : 'Control'

  try {
    // Hold down the modifier key
    await page.keyboard.down(modifierKey)

    // Click each thought while holding the modifier
    for (const value of thoughtValues) {
      await clickThought(value)
    }
  } catch (error) {
    // Always release modifier key on error
    await page.keyboard.up(modifierKey)
    console.error('Error in multiselectThoughts:', error)
    throw error
  } finally {
    // Release modifier key unless explicitly asked to keep it held
    if (!keepModifierHeld) {
      await page.keyboard.up(modifierKey)
    }
  }
}

/**
 * Release the modifier key if it's currently held.
 * Useful for cleanup in tests or error recovery.
 */
export const releaseModifierKey = async () => {
  const modifierKey = isMac ? 'Meta' : 'Control'
  await page.keyboard.up(modifierKey)
}

export default multiselectThoughts
