import path from 'path'
import { KnownDevices } from 'puppeteer'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import swipe from '../helpers/swipe'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('open with keyboard', async () => {
  await press('P', { meta: true })

  // TODO: Replace sleep with wait
  await sleep(200)

  expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'commandPalette' })
  await setTheme('Light')
  expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'commandPalette-light' })
})

it('open with gesture', async () => {
  const importText = `
    - Hello`

  await page.emulate(KnownDevices['iPhone 15 Pro'])
  await paste(importText)

  await swipe('r')

  // the command palette should open
  const popupValue = await page.locator('[data-testid=popup-value]').wait()
  expect(popupValue).toBeTruthy()
})
