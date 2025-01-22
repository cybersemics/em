import { KeyInput, Keyboard } from 'puppeteer'
import { page } from '../setup'

type Options = Parameters<Keyboard['press']>[1]

/** Presses a key on the keyboad. Extends page.keyboard.press options with meta, ctrl, and shift for easy modifier presses. */
const press = async (
  key: KeyInput,
  { ctrl, meta, shift, ...options }: Options & { ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
) => {
  if (ctrl) await page.keyboard.down('Control')
  if (meta) await page.keyboard.down('Meta')
  if (shift) await page.keyboard.down('Shift')

  await page.keyboard.press(key, options)

  if (ctrl) await page.keyboard.up('Control')
  if (meta) await page.keyboard.up('Meta')
  if (shift) await page.keyboard.up('Shift')
}

export default press
