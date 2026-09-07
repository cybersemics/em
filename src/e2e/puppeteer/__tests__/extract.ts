import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('Command Universe', () => {
  // The Command Universe's search input takes the browser selection when it opens, and the document has only one
  // selection, so without the snapshot in state.selectionOffsets these commands see a collapsed caret in the search box
  // and report "No text selected to extract". Only a real browser moves the selection on focus, so this cannot be
  // covered in JSDOM.
  it('Extract Subthought extracts the text selected before the Command Universe opened', async () => {
    await paste('- hello world')
    await clickThought('hello world')
    await setSelection(6, 11)

    await command('Extract Subthought', { inputType: 'commandPalette' })

    await waitForEditable('hello')
    expect(await exportThoughts()).toEqual('\n- hello\n  - world\n')
  })

  it('Extract Category extracts the text selected before the Command Universe opened', async () => {
    await paste('- hello world')
    await clickThought('hello world')
    await setSelection(6, 11)

    await command('Extract Category', { inputType: 'commandPalette' })

    await waitForEditable('hello')
    expect(await exportThoughts()).toEqual('\n- world\n  - hello\n')
  })
})
