import click from '../helpers/click'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'

/** Retrieve the innerHTML of the first note on the page. Assumes that there will be only a single note. */
const getFirstNoteText = () => browser.execute(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML)

it('Can change the background color of a thought that already has the same background color applied to part of its text, then change the text color', async () => {
  await paste(`- some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text`)

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="red"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  await browser.keys('Escape')

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

  await click('[data-testid="toolbar-icon"][aria-label="Note"]')

  // WebDriver clicks move focus off the note and clear Redux `noteFocus`; synthetic DOM clicks keep the note focused.
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]') //, { preserveActiveFocus: true })
  await click('[aria-label="background color swatches"] [aria-label="red"]') //, { preserveActiveFocus: true })
  await click('[aria-label="text color swatches"] [aria-label="red"]') //, { preserveActiveFocus: true })

  const result = await getFirstNoteText()
  expect(result).toBe('<font color="#ff573d">Multi-word note</font>')
})
