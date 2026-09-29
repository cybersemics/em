/**
 * IOS Safari color picker tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import getToolbarHeight from '../helpers/getToolbarHeight'
import paste from '../helpers/paste'
import tap from '../helpers/tap'
import tapToolbar, { toolbarTapOptions } from '../helpers/tapToolbar'
import waitForElement from '../helpers/waitForElement'

/** Retrieve the innerHTML of the first note on the page. Assumes that there will be only a single note. */
const getFirstNoteText = () => browser.execute(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML)

describe('Color', () => {
  it('Can change the background color of a thought that already has the same background color applied to part of its text, then change the text color', async () => {
    await paste(`- some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text`)

    await tapToolbar('Text Color', 'background color swatches', 'red')
    // The picker is already open, so tap the swatch directly; tapToolbar would tap the Text Color button again and toggle the picker closed.
    await tap(await waitForElement('[aria-label="text color swatches"] [aria-label="red"]'), toolbarTapOptions)

    // Applying a font color clears the background color.
    const thought = await getEditingText()
    expect(thought).toBe('<font color="#ff573d">some formatted text</font>')
  })

  it('Can change the background color of a note that already has the same background color applied to part of its text, then change the text color', async () => {
    await paste(
      `
    - a
      - =note
        - Multi-word <font color="#000000" style="background-color: rgb(255, 87, 61);">note</font>
  `,
    )

    // Set the cursor on the thought, then move the caret into its note.
    await clickThought('a')
    await tapToolbar('Note')

    await tapToolbar('Text Color', 'background color swatches', 'red')
    await tap(await waitForElement('[aria-label="text color swatches"] [aria-label="red"]'), toolbarTapOptions)

    const result = await getFirstNoteText()
    expect(result).toBe('<font color="#ff573d">Multi-word note</font>')
  })

  it('Does not shift the Text Color button and its swatches down when a color is applied', async () => {
    await paste('- some text')

    await tapToolbar('Text Color')
    await waitForElement('[aria-label="Color Picker"]')

    // WebKit lays out the shift inconsistently: iOS 26.6 grows the toolbar, while 26.3 renders it unchanged. BrowserStack
    // matches osVersion on the major only, so this only catches a regression when the pool allocates a device that relayouts.
    const toolbarHeight = await getToolbarHeight()

    // The picker is already open, so tap the swatch directly; tapToolbar would tap the Text Color button again and toggle the picker closed.
    await tap(await waitForElement('[aria-label="text color swatches"] [aria-label="red"]'), toolbarTapOptions)
    await waitForElement('[data-editing=true] [data-editable] font[color="#ff573d"]')

    // The picker is rendered inside the Text Color button, so the toolbar growing taller moves the button's contents and
    // the swatches down with it.
    expect(await getToolbarHeight()).toBe(toolbarHeight)
  })
})
