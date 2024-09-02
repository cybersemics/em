import sleep from '../../../util/sleep'
import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000 })

const { $, getEditable, getPage, press, type } = helpers()

/** Custom helper for pasting plain text, avoiding the existing `paste` helper that uses `importText` internally. */
const pastePlainText = async (text: string) => {
  const page = getPage()

  // Load text into clipboard
  await page.evaluate(text => {
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  }, text)

  await sleep(300)

  await page.keyboard.down('Shift')
  await page.keyboard.press('Insert')
  await page.keyboard.up('Shift')
}

/** Custom helper for pasting HTML, avoiding the existing `paste` helper that uses `importText` internally. */
const pasteHTML = async (html: string) => {
  const page = getPage()

  // Load HTML into clipboard
  await page.evaluate(html => {
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
  }, html)

  await sleep(300)

  await page.keyboard.down('Shift')
  await page.keyboard.press('Insert')
  await page.keyboard.up('Shift')
}

it('escapes typed HTML', async () => {
  await press('Enter', { delay: 10 })
  await type('hello <b>world</b>')
  await press('Enter', { delay: 10 })

  const editable = (await getEditable('hello <b>world</b>')).asElement()!

  const text = await (await editable.getProperty('innerHTML')).jsonValue()
  expect(text).toBe('hello &lt;b&gt;world&lt;/b&gt;')
})

it('preserves pasted HTML as text/html', async () => {
  await press('Enter', { delay: 10 })
  await pasteHTML('hello <b>world</b>')

  await sleep(1000)

  const editable = (await $('div.editing .editable'))!.asElement()!

  const text = await (await editable.getProperty('innerHTML')).jsonValue()
  expect(text).toBe('hello <b>world</b>')
})

it('escapes pasted HTML as text/plain', async () => {
  await press('Enter', { delay: 10 })
  await pastePlainText('hello <b>world</b>')

  await sleep(1000)

  const editable = (await $('div.editing .editable'))!.asElement()!

  const text = await (await editable.getProperty('innerHTML')).jsonValue()
  expect(text).toBe('hello &lt;b&gt;world&lt;/b&gt;')
})
