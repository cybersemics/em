/** Snapshots only. Covers the help genie's halo, trail, and hot core at rest, in straight flight, on an arc, and mid-reversal. */
import path from 'path'
import configureSnapshots from '../configureSnapshots'
import openModal from '../helpers/openModal'
import screenshot from '../helpers/screenshot'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('HelpGenie', async () => {
  // On the TDD base branch, the new fixture must fail at runtime rather than prevent compilation.
  await openModal('testHelpGenie' as Parameters<typeof openModal>[0])

  // Each pose's canvas stays busy until its first frame is drawn. Waiting for all four also fails the test outright
  // if WebGL is unavailable, rather than approving a snapshot of empty boxes.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="help-genie"][aria-busy="false"]').length === 4,
  )

  expect(await screenshot()).toMatchImageSnapshot()
})
