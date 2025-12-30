/** Test coverage of basic UI appearance. Snapashots only. Do not place behavioral tests here. If a component has snapshot and behavioral tests, move them to a separate test file. */
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

it('CommandPalette', async () => {
  await press('P', { meta: true })

  // TODO: Replace sleep with wait
  await sleep(200)

  expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'commandPalette' })
  await setTheme('Light')
  expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'commandPalette-light' })
})

it('GestureMenu', async () => {
  await page.emulate(KnownDevices['iPhone 15 Pro'])
  await paste('Hello')

  // swipe and hold
  await swipe('r')

  // wait for the gesture menu to appear
  await page.locator('[data-testid=popup-value]').wait()

  expect(await screenshot()).toMatchImageSnapshot()
})

it('CommandCenter', async () => {
  await page.emulate(KnownDevices['iPhone 15 Pro'])
  await paste('Hello')

  // open the Command Center
  await swipe('u', true)

  expect(await screenshot()).toMatchImageSnapshot()
})
