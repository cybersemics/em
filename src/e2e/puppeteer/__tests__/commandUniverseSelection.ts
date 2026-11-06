/** Test coverage of commands that read or set the browser text selection when they are invoked from the Command
 * Universe. The Command Universe focuses its own search input, which moves the document selection out of the thought's
 * editable. It hands the selection back before the chosen command runs, so that the command sees the text the user
 * highlighted rather than the input, and whatever the command does to the selection stands.
 */
import colors from '../../../colors.config'
import rgbaToHex from '../../../util/rgbaToHex'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import getCaretOffset from '../helpers/getCaretOffset'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

it('Text Color applies to the selected text when invoked from the Command Universe', async () => {
  await paste('- hello world')
  await clickThought('hello world')

  // select "world"
  await setSelection(6, 11)

  // Text Color opens the ColorPicker rather than acting immediately, so the selection has to survive the Command
  // Universe closing and stay alive until a swatch is clicked.
  await command('Text Color', { inputType: 'commandPalette' })

  const swatchSelector =
    '[data-testid="toolbar-icon"][aria-label="Text Color"] [aria-label="text color swatches"] [aria-label="blue"]'
  await waitForSelector(swatchSelector)
  await click(swatchSelector)

  // only "world" should be colored, not the whole thought
  expect(await getEditingText()).toBe(`hello <font color="${rgbaToHex(colors.light.blue)}">world</font>`)
})

it('a collapsed caret survives a command run from the Command Universe', async () => {
  await paste(`
    - one
    - two
  `)
  await clickThought('two')

  // put the caret in the middle of the thought, where neither end of the value would land by accident
  await setSelection(1, 1)

  await command('Move Thought Up', { inputType: 'commandPalette' })

  // wait for the Command Universe to leave the DOM, so that nothing it does as it closes can still move the caret
  await waitForSelector('[data-testid=desktop-command-universe]', { hidden: true })

  // moveThoughtUp reads selection.offset() unguarded, which reports 0 while the search input holds focus. The caret
  // lands correctly because the Command Universe hands it back before the command runs, so this pins that hand-back
  // rather than anything in moveThoughtUp.
  expect(await getCaretOffset()).toBe(1)
})

// https://github.com/cybersemics/em/issues/5733
it('Note keeps the caret in the new note when invoked from the Command Universe', async () => {
  await paste('- hello world')
  await clickThought('hello world')

  await command('Note', { inputType: 'commandPalette' })

  // wait for the Command Universe to leave the DOM, so that nothing it does as it closes can still move the focus
  await waitForSelector('[data-testid=desktop-command-universe]', { hidden: true })

  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  expect(focused).toBe('note-editable')
})

// https://github.com/cybersemics/em/issues/6228
it('Select All leaves the selection out of edit mode when invoked from the Command Universe', async () => {
  await paste(`
    - a
    - b
    - c
    - d
  `)
  await clickThought('d')

  await command('Select All', { inputType: 'commandPalette' })

  // wait for the Command Universe to leave the DOM, so that nothing it does as it closes can still move the focus
  await waitForSelector('[data-testid=desktop-command-universe]', { hidden: true })

  // faux carets render on the frame after the caret lands in a selected thought
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await page.evaluate(() => new Promise(requestAnimationFrame))

  expect(await page.$$('[aria-label="bullet"][data-highlighted="true"]')).toHaveLength(4)
  const focused = await page.evaluate(() => document.activeElement?.closest('[data-editable]')?.textContent ?? null)
  expect(focused).toBe(null)
  expect(await page.$$('[data-testid="faux-caret-multicursor"]')).toHaveLength(0)
})
