import { page } from '../session'
import clickBullet from './clickBullet'
import waitForEditable from './waitForEditable'

/** Shift + Click the bullet of the given thought to select all thoughts between it and the previously selected thought. */
const shiftClickThought = async (value: string) => {
  await waitForEditable(value)

  await page.keyboard.down('Shift')
  try {
    await clickBullet(value)
  } finally {
    await page.keyboard.up('Shift')
  }
}

export default shiftClickThought
