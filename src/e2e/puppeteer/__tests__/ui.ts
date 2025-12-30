/** Test coverage of basic UI appearance. Snapashots only. Do not place behavioral tests here. If a component has snapshot and behavioral tests, move them to a separate test file. */
import path from 'path'
import { KnownDevices } from 'puppeteer'
import configureSnapshots from '../configureSnapshots'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import swipe from '../helpers/swipe'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('CommandCenter', async () => {
  await page.emulate(KnownDevices['iPhone 15 Pro'])
  await paste('Hello')

  // open the Command Center
  await swipe('u', true)

  expect(await screenshot()).toMatchImageSnapshot()
})
