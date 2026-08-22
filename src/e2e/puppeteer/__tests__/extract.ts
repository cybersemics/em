import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
import setSelection from '../helpers/setSelection'
import waitForContextHasChildWithValue from '../helpers/waitForContextHasChildWithValue'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Runs a command from the Command Universe by searching for it by name and pressing Enter. */
const runFromCommandUniverse = async (name: string) => {
  await press('P', { meta: true })
  await waitForSelector('[data-testid=desktop-command-universe]')
  await page.keyboard.type(name)
  await press('Enter')
}

describe('Command Universe', () => {
  // The Command Universe's search input takes the browser selection when it opens, and the document has only one
  // selection, so without the snapshot in state.selectionOffsets these commands see a collapsed caret in the search box
  // and report "No text selected to extract". Only a real browser moves the selection on focus, so this cannot be
  // covered in JSDOM.
  it('Extract Subthought extracts the text selected before the Command Universe opened', async () => {
    await paste('- hello world')
    await clickThought('hello world')
    await setSelection(6, 11)

    await runFromCommandUniverse('Extract Subthought')

    await waitForContextHasChildWithValue(['hello'], 'world')
    expect(await exportThoughts()).toEqual('\n- hello\n  - world\n')
  })

  it('Extract Category extracts the text selected before the Command Universe opened', async () => {
    await paste('- hello world')
    await clickThought('hello world')
    await setSelection(6, 11)

    await runFromCommandUniverse('Extract Category')

    await waitForContextHasChildWithValue(['world'], 'hello')
    expect(await exportThoughts()).toEqual('\n- world\n  - hello\n')
  })
})
