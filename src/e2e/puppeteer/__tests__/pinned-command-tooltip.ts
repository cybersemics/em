/** Snapshots only. Covers the pinned command overlay's layout at a portrait and a landscape viewport: the glow extents and the text row. The screenshot helper disables filters, so the blur itself is not part of the snapshot. */
import path from 'path'
import configureSnapshots from '../configureSnapshots'
import openModal from '../helpers/openModal'
import screenshot from '../helpers/screenshot'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('portrait anchors the text bottom-left across the full width', async () => {
  await page.setViewport({ width: 390, height: 844 })
  // On the TDD base branch, the new fixture must fail at runtime rather than prevent compilation.
  await openModal('testPinnedCommandTooltip' as Parameters<typeof openModal>[0])
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for Context View"]:not([aria-hidden="true"])')

  expect(await screenshot()).toMatchImageSnapshot()
})

it('landscape anchors the text bottom-right', async () => {
  await page.setViewport({ width: 844, height: 390 })
  // On the TDD base branch, the new fixture must fail at runtime rather than prevent compilation.
  await openModal('testPinnedCommandTooltip' as Parameters<typeof openModal>[0])
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for Context View"]:not([aria-hidden="true"])')

  expect(await screenshot()).toMatchImageSnapshot()
})
