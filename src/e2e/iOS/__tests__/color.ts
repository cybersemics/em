/**
 * IOS Safari color picker tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import tap from '../helpers/tap'
import tapToolbar, { toolbarTapOptions } from '../helpers/tapToolbar'
import waitForElement from '../helpers/waitForElement'

/** Retrieve the innerHTML of the first note on the page. Assumes that there will be only a single note. */
const getFirstNoteText = () => browser.execute(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML)

/** Tap a swatch in the color picker while it is already open. tapToolbar would tap the Text Color button again first, which toggles the picker closed and unmounts the swatches. */
const tapSwatch = async (group: string, color: string) =>
  tap(await waitForElement(`[aria-label="${group}"] [aria-label="${color}"]`), toolbarTapOptions)

describe('Color', () => {
  it('Can change the background color of a thought that already has the same background color applied to part of its text, then change the text color', async () => {
    await paste(`- some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text`)

    await tapToolbar('Text Color', 'background color swatches', 'red')
    await tapSwatch('text color swatches', 'red')

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
    await tapSwatch('text color swatches', 'red')

    const result = await getFirstNoteText()
    expect(result).toBe('<font color="#ff573d">Multi-word note</font>')
  })
})
