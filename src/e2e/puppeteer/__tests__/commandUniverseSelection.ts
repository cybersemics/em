/** Test coverage of commands that read the browser text selection when they are invoked from the Command Universe.
 * The Command Universe focuses its own search input, which moves the document selection out of the thought's editable,
 * so a command that reads the selection sees the input rather than the text the user highlighted.
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

  // The caret is restored when the Command Universe unmounts, which is gated on its fade-out rather than on the
  // command, so the assertion has to wait for the palette to leave the DOM or it races the restore.
  await waitForSelector('[data-testid=desktop-command-universe]', { hidden: true })

  // moveThoughtUp reads selection.offset() unguarded, which reports 0 while the search input holds focus. The caret
  // still lands correctly because the Command Universe saves and restores it around the input focus, so this pins the
  // save/restore round-trip rather than anything in moveThoughtUp.
  expect(await getCaretOffset()).toBe(1)
})
