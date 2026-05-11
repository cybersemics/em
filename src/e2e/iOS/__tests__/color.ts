import click from '../helpers/click'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'

it('Can change the background color of a thought that already has the same background color applied to part of its text, then change the text color', async () => {
  await paste(`- some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text`)

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="red"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  await browser.keys('Escape')

  const thought = await getEditingText()
  expect(thought).toBe('<font color="#ff573d">some formatted text</font>')
})
