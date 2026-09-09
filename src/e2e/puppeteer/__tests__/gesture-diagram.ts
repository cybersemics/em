import path from 'path'
import configureSnapshots from '../configureSnapshots'
import openModal from '../helpers/openModal'
import renderGestureDiagram from '../helpers/renderGestureDiagram'
import screenshot from '../helpers/screenshot'

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
