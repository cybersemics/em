import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000 })

/** Custom helper for pasting plain text, avoiding the existing `paste` helper that uses `importText` internally. */
const pastePlainText = async (text: string) => {
  // Load text into clipboard
  await page.evaluate(async text => {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  }, text)

  await press('Insert', { shift: true })
}

/** Custom helper for pasting HTML, avoiding the existing `paste` helper that uses `importText` internally. */
const pasteHTML = async (html: string) => {
  // Load HTML into clipboard
  await page.evaluate(async html => {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob(['Plain text should be ignored when pasting as HTML.'], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
  }, html)

  await press('Insert', { shift: true })
}

it('escapes typed HTML', async () => {
  await press('Enter', { delay: 10 })
  await keyboard.type('hello <b>world</b>')
  await press('Enter', { delay: 10 })

  const editable = await waitForEditable('hello &lt;b&gt;world&lt;/b&gt;')
  expect(editable).toBeTruthy()
})

it('preserves pasted HTML as text/html in bold case', async () => {
  await press('Enter', { delay: 10 })
  await pasteHTML('hello <b>world</b>')
  const editable = await waitForEditable('hello <b>world</b>')
  expect(editable).toBeTruthy()
})

// TODO: Broken in due to reverting related code. See: #2814.
it.skip('preserves pasted HTML as text/html with text color and background color', async () => {
  await press('Enter', { delay: 10 })
  await pasteHTML(
    '<font color="#000000" style="background-color: rgb(255, 136, 0);">Hello </font><font color="#000000" style="background-color: rgb(0, 214, 136);">World</font>',
  )

  const editable = await waitForEditable(
    '<span style="background-color: rgb(255, 136, 0);color: #000000;">Hello </span><span style="background-color: rgb(0, 214, 136);color: #000000;">World</span>',
  )
  expect(editable).toBeTruthy()
})

it('escapes pasted HTML as text/plain', async () => {
  await press('Enter', { delay: 10 })
  await pastePlainText('hello <b>world</b>')

  const editable = await waitForEditable('hello &lt;b&gt;world&lt;/b&gt;')
  expect(editable).toBeTruthy()
})
