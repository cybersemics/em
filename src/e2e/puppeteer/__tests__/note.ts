import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditingTextChange from '../helpers/waitForEditingTextChange'
import waitForNoteFocus from '../helpers/waitForNoteFocus'

// https://github.com/cybersemics/em/issues/6001
it('pressing Enter mid-note creates an empty sibling without changing the thought or the note', async () => {
  await paste(`- aaa bbb ccc ddd`)
  await clickThought('aaa bbb ccc ddd')
  await press('n', { meta: true, alt: true })
  await waitForNoteFocus()
  await keyboard.type('eee fff ggg')

  // place the caret after "eee"
  await press('Home')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('Enter')
  await waitForEditingTextChange('aaa bbb ccc ddd')

  expect(await getEditingText()).toBe('')
  expect(await exportThoughts()).toBe(`
- aaa bbb ccc ddd
  - =note
    - eee fff ggg
- 
`)
})
