/** Snapshots only. Covers the pinned command overlay's layout at a portrait and a landscape viewport: the glow extents, the text row, and the expanded ring beside it. The screenshot helper disables filters, so the blur itself is not part of the snapshot. */
import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import hideHUD from '../helpers/hideHUD'
import screenshot from '../helpers/screenshot'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/** Pins Context View and opens its tooltip from the ring. Hides the HUD so the toolbar and nav do not show through the tooltip, which the screenshot helper leaves unblurred. */
const openPinnedCommandTooltip = async () => {
  // Pinning is setup here, not the subject; the Command Universe's Pin button is covered by its own tests.
  await page.evaluate(() => window.em.store.dispatch({ type: 'pinCommand', commandId: 'toggleContextView' }))
  await click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for Context View"]:not([aria-hidden="true"])')
  await hideHUD()
}

it('portrait anchors the text bottom-left across the full width', async () => {
  await page.setViewport({ width: 390, height: 844 })
  await openPinnedCommandTooltip()

  expect(await screenshot()).toMatchImageSnapshot()
})

it('landscape anchors the text bottom-right', async () => {
  await page.setViewport({ width: 844, height: 390 })
  await openPinnedCommandTooltip()

  expect(await screenshot()).toMatchImageSnapshot()
})
