/** Test coverage of basic UI appearance. Snapashots only. Do not place behavioral tests here. If a component has snapshot and behavioral tests, move them to a separate test file. */
import path from 'path'
import { KnownDevices } from 'puppeteer'
import openCommandCenterCommand from '../../../commands/openCommandCenter'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('CommandPalette', async () => {
  await press('P', { meta: true })

  // wait for the command palette to appear before taking screenshot
  await waitForSelector('[data-testid=command-palette]')

  expect(await screenshot({ hardwareAcceleration: false })).toMatchImageSnapshot({
    customSnapshotIdentifier: 'commandPalette',
  })
  await setTheme('Light')
  expect(await screenshot({ hardwareAcceleration: false })).toMatchImageSnapshot({
    customSnapshotIdentifier: 'commandPalette-light',
  })
})

it('GestureMenu', async () => {
  await page.emulate(KnownDevices['iPhone 15 Pro'])

  await hideHUD()

  await paste('Hello')

  // When cursor is on the thought, gesture menu is rendered with two new options. When cursor is null, those options are not shown. Hence always be consistent and set cursor to the thought.
  await clickThought('Hello')

  // swipe and hold an invalid gesture so that the snapshot just includes Cancel and Open Gesture Cheatsheet and does not need to be updated every time a gesture is added or changed.
  await gesture('rdldrd', { hold: true })

  // wait for the gesture menu to appear
  await waitForSelector('[data-testid=popup-value]')

  expect(await screenshot({ hardwareAcceleration: false })).toMatchImageSnapshot()
})

it('CommandCenter', async () => {
  await page.emulate(KnownDevices['iPhone 15 Pro'])

  // the undo button toggles between active and inactive states for some reason. Hence hide the HUD to ensure the undo button is not visible.
  await hideHUD()

  await paste('Hello')

  // Sometimes after pasting, the cursor is not on the thought. Hence click it to ensure the cursor is on the thought.
  await clickThought('Hello')

  // open the Command Center
  await gesture(openCommandCenterCommand)

  // wait for the command center panel to appear before taking screenshot
  await waitForSelector('[data-testid=command-center-panel]')

  expect(await screenshot({ hardwareAcceleration: false })).toMatchImageSnapshot()
})
