import path from 'path'
import { isMac } from '../../../browser'
import configureSnapshots from '../configureSnapshots'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Open sidebar and wait for it to slide all the way open. */
const openCommandPalette = async () => {
  // Simulate pressing Ctrl + P or Command + P
  //    process.platform === 'darwin'
  const modifierKey = isMac ? 'Meta' : 'Control' // Use Meta for macOS, Control for others

  await page.keyboard.down(modifierKey) // Press the modifier key
  await press('P') // Press the 'P' key
  await page.keyboard.up(modifierKey) // Release the modifier key

  await new Promise(resolve => setTimeout(resolve, 200))
}

it('command palette', async () => {
  await openCommandPalette()

  expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'commandPalette' })
  await setTheme('Light')
  expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'commandPalette-light' })
})
