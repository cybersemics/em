import click from '../helpers/click'
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'

/** Click the first note. Assumes that there will be only a single note. */
const clickFirstNote = () => click('[aria-label="note-editable"]')

/** Retrieve the innerHTML of the first note on the page. Assumes that there will be only a single note. */
const getFirstNoteText = () => browser.execute(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML)

it('Can change the background color of a thought that already has the same background color applied to part of its text, then change the text color', async () => {
  await newThought()
  await paste(
    [''],
    `
    - some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text
  `,
  )

  // change the background color on the thought
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="red"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const thought = await getEditingText()
  expect(thought).toBe('<font color="rgb(255, 87, 61)">some formatted text</font>')
})

it('Can change the background color of a note that already has the same background color applied to part of its text, then change the text color', async () => {
  await newThought()
  await paste(
    [''],
    `
    - a
      - =note
        - Multi-word <font color="#000000" style="background-color: rgb(255, 87, 61);">note</font>
  `,
  )

  await clickFirstNote()
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="red"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const result = await getFirstNoteText()
  expect(result).toBe('<font color="rgb(255, 87, 61)">Multi-word note</font>')
})
