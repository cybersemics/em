import $ from '../helpers/$'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import tap from '../helpers/tap'

/** Retrieve the innerHTML of the first note on the page. Assumes that there will be only a single note. */
const getFirstNoteText = async () => (await $('[aria-label="note-editable"]')).getHTML({ includeSelectorTag: false })

it('Can change the background color of a thought that already has the same background color applied to part of its text, then change the text color', async () => {
  const content = '- some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text'
  await paste(content)

  await tap('[data-testid="toolbar-icon"][aria-label="Text Color"]', { horizontalTapLine: 'center' })
  await tap('[aria-label="background color swatches"] [aria-label="red"]', { horizontalTapLine: 'center' })
  await tap('[aria-label="text color swatches"] [aria-label="red"]', { horizontalTapLine: 'center' })

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

  await tap('[data-testid="toolbar-icon"][aria-label="Note"]', { horizontalTapLine: 'center' })

  await tap('[data-testid="toolbar-icon"][aria-label="Text Color"]', { horizontalTapLine: 'center' })
  await tap('[aria-label="background color swatches"] [aria-label="red"]', { horizontalTapLine: 'center' })
  await tap('[aria-label="text color swatches"] [aria-label="red"]', { horizontalTapLine: 'center' })

  const result = await getFirstNoteText()
  expect(result).toBe('<font color="#ff573d">Multi-word note</font>')
})
