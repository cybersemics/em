import { KeyInput, Keyboard } from 'puppeteer'
import { page } from '../setup'
import waitForEmIdle from './waitForEmIdle'

type Options = Parameters<Keyboard['press']>[1]

/** Makes sure global keyboard shortcuts are sent to the app when no input owns focus. */
const focusAppKeyboardTargetIfNeeded = async (): Promise<void> => {
  await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    const isKeyboardTarget =
      active &&
      (active.hasAttribute('data-editable') ||
        active.getAttribute('aria-label') === 'note-editable' ||
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT')

    if (isKeyboardTarget) return

    const content = document.getElementById('content')
    const target = content || document.body
    target.tabIndex = target.tabIndex >= 0 ? target.tabIndex : -1
    target.focus({ preventScroll: true })
  })
}

/** Presses a key on the keyboad. Extends page.keyboard.press options with meta, ctrl, and shift for easy modifier presses. */
const press = async (
  key: KeyInput,
  {
    alt,
    ctrl,
    meta,
    shift,
    ...options
  }: Options & { alt?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
) => {
  await focusAppKeyboardTargetIfNeeded()

  if (ctrl) await page.keyboard.down('Control')
  if (meta) await page.keyboard.down('Meta')
  if (shift) await page.keyboard.down('Shift')
  if (alt) await page.keyboard.down('Alt')

  await page.keyboard.press(key, options)

  if (ctrl) await page.keyboard.up('Control')
  if (meta) await page.keyboard.up('Meta')
  if (shift) await page.keyboard.up('Shift')
  if (alt) await page.keyboard.up('Alt')

  await waitForEmIdle()
}

export default press
