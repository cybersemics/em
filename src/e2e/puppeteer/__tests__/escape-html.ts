import press from '../helpers/press'
import type from '../helpers/type'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000 })

/** Custom helper for pasting plain text, avoiding the existing `paste` helper that uses `importText` internally. */
const pastePlainText = async (text: string) => {
  // Load text into clipboard
  await page.evaluate(text => {
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  }, text)

  await page.keyboard.down('Shift')
  await page.keyboard.press('Insert')
  await page.keyboard.up('Shift')
}

/** Custom helper for pasting HTML, avoiding the existing `paste` helper that uses `importText` internally. */
const pasteHTML = async (html: string) => {
  // Load HTML into clipboard
  await page.evaluate(html => {
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob(['Plain text should be ignored when pasting as HTML.'], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
  }, html)

  await page.keyboard.down('Shift')
  await page.keyboard.press('Insert')
  await page.keyboard.up('Shift')
}

it('escapes typed HTML', async () => {
  await press('Enter', { delay: 10 })
  await type('hello <b>world</b>')
  await press('Enter', { delay: 10 })

  const editable = await waitForEditable('hello &lt;b&gt;world&lt;/b&gt;')
  expect(editable).toBeTruthy()
})

it('preserves pasted HTML as text/html', async () => {
  await press('Enter', { delay: 10 })
  await pasteHTML('hello <b>world</b>')

  const editable = await waitForEditable('hello <b>world</b>')
  expect(editable).toBeTruthy()
})

it('escapes pasted HTML as text/plain', async () => {
  await press('Enter', { delay: 10 })
  await pastePlainText('hello <b>world</b>')

  const editable = await waitForEditable('hello &lt;b&gt;world&lt;/b&gt;')
  expect(editable).toBeTruthy()
})
