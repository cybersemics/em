import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import hideVisibility from '../helpers/hideVisibility'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

// TODO: Fix flaky snapshot test
// https://github.com/cybersemics/em/actions/runs/13156294896
// https://github.com/cybersemics/em/actions/runs/13182568493
// https://github.com/cybersemics/em/actions/runs/13224979298
it.skip('ColorPicker', async () => {
  await paste('Hello world')

  await clickThought('Hello world')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  await hideVisibility('[aria-label="menu"]')
  await hideVisibility('[aria-label="nav"]')
  await hideVisibility('[data-testid="toolbar-icon"]:not([aria-label="Text Color"])')

  // ColorPicker swatches have small pixel differences if we do not wait 50–100ms.
  // Possibly an animation that has not been turned off?
  await sleep(100)

  expect(await screenshot()).toMatchImageSnapshot()
})
