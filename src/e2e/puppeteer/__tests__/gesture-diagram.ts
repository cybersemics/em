import path from 'path'
import { KnownDevices } from 'puppeteer'
import configureSnapshots from '../configureSnapshots'
import deviceEmulation from '../helpers/deviceEmulation'
import openModal from '../helpers/openModal'
import renderGestureDiagram from '../helpers/renderGestureDiagram'
import screenshot from '../helpers/screenshot'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:

  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

it('GestureDiagram', async () => {
  await openModal('testGestureDiagram')

  const image = await screenshot()
  expect(image).toMatchImageSnapshot()
})

// https://github.com/cybersemics/em/pull/5317
it('keeps the filled arrowhead visible while preserving gradient transparency', async () => {
  const props = {
    path: 'r',
    size: 100,
    arrowSize: 20,
    strokeWidth: 2,
    maxWidth: 140,
    maxHeight: 40,
    viewBox: '-10 -20 140 40' as const,
    style: { display: 'block' as const, width: 140, height: 40 },
    glow: false,
  }
  // The viewBox places the shaft endpoint at x=110. Sample the arrow beyond its round cap.
  const arrowClip = { x: 112, y: 18, width: 6, height: 4 }
  const shaftClip = { x: 60, y: 19, width: 2, height: 2 }
  const translucent = 'rgba(0, 0, 0, 0.45)'

  await renderGestureDiagram({ ...props, useGradient: false, color: '#000' })
  const solidArrow = await screenshot({ clip: arrowClip })

  await renderGestureDiagram({ ...props, useGradient: false, color: translucent })
  const translucentShaft = await screenshot({ clip: shaftClip })

  // A variable also typechecks on the TDD base, before GestureDiagram declares the gradient prop.
  const gradientProps = { ...props, color: '#000', gradient: { from: translucent, to: translucent } }
  await renderGestureDiagram(gradientProps)
  const gradientArrow = await screenshot({ clip: arrowClip })
  const gradientShaft = await screenshot({ clip: shaftClip })

  expect(gradientArrow).toEqual(solidArrow)
  expect(gradientShaft).toEqual(translucentShaft)
})

describe('mobile stroke sizing', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // https://github.com/cybersemics/em/pull/5319
  it('uses the same visible stroke thickness for straight, circular and question-mark gestures in Help', async () => {
    await openModal('help')
    await waitForSelector('tr td:last-child svg')

    const widths = await page.evaluate(() =>
      ['New Thought', 'New Thought (above)', 'Command Universe'].map(label => {
        const row = Array.from(document.querySelectorAll('tr')).find(
          row => row.querySelector('b')?.textContent === label,
        )
        const svg = row?.querySelector('td:last-child svg')
        const path = Array.from(svg?.querySelectorAll<SVGPathElement>('path[stroke-width]') ?? []).find(
          path => !path.closest('defs'),
        )
        if (!path) throw new Error(`Missing gesture stroke for ${label}.`)
        const matrix = path.getScreenCTM()!
        return Number(path.getAttribute('stroke-width')) * Math.hypot(matrix.a, matrix.b)
      }),
    )

    expect(widths[0]).toBeGreaterThan(0)
    expect(widths[1]).toBeCloseTo(widths[0], 6)
    expect(widths[2]).toBeCloseTo(widths[0], 6)
  })
})
