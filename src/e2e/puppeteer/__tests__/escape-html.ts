import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import setClipboard from '../helpers/setClipboard'
import waitForEditable from '../helpers/waitForEditable'
import waitForEditingTextChange from '../helpers/waitForEditingTextChange'

vi.setConfig({ testTimeout: 20000 })

it('escapes typed HTML', async () => {
  await press('Enter', { delay: 10 })
  await keyboard.type('hello <b>world</b>')
  await press('Enter', { delay: 10 })

  const editable = await waitForEditable('hello &lt;b&gt;world&lt;/b&gt;')
  expect(editable).toBeTruthy()
})

it('preserves pasted HTML as text/html in bold case', async () => {
  await press('Enter', { delay: 10 })
  await setClipboard({ html: 'hello <b>world</b>', text: 'Plain text should be ignored when pasting as HTML.' })
  await press('Insert', { shift: true })
  const editable = await waitForEditable('hello <b>world</b>')
  expect(editable).toBeTruthy()
})

// TODO: Broken in due to reverting related code. See: #2814.
it.skip('preserves pasted HTML as text/html with text color and background color', async () => {
  await press('Enter', { delay: 10 })
  await setClipboard({
    html: '<font color="#000000" style="background-color: rgb(255, 136, 0);">Hello </font><font color="#000000" style="background-color: rgb(0, 214, 136);">World</font>',
    text: 'Plain text should be ignored when pasting as HTML.',
  })
  await press('Insert', { shift: true })

  const editable = await waitForEditable(
    '<span style="background-color: rgb(255, 136, 0);color: #000000;">Hello </span><span style="background-color: rgb(0, 214, 136);color: #000000;">World</span>',
  )
  expect(editable).toBeTruthy()
})

it('escapes pasted HTML as text/plain', async () => {
  await press('Enter', { delay: 10 })
  await setClipboard({ text: 'hello <b>world</b>' })
  await press('Insert', { shift: true })

  const editable = await waitForEditable('hello &lt;b&gt;world&lt;/b&gt;')
  expect(editable).toBeTruthy()
})

// https://github.com/cybersemics/em/issues/4730
it('inserts a space immediately after an emoji pasted at the beginning of a thought', async () => {
  await press('Enter')
  await keyboard.type('Hello')
  await waitForEditable('Hello')
  await press('Home')
  await setClipboard({ text: '🧠' })

  await press('Insert', { shift: true })

  await waitForEditingTextChange('Hello')
  expect(await getEditingText()).toBe('🧠 Hello')
  expect(await getSelection().focusOffset).toBe('🧠 '.length)
})
