import path from 'path'
import configureSnapshots from '../configureSnapshots'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import snapshotFirstPaint from '../helpers/snapshotFirstPaint'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

describe('animation first paint examples', () => {
  beforeEach(hideHUD)

  it('multiline thought expansion first frame', async () => {
    await paste(`
      - a
      - External objects (bodies) are merely appearances, hence also nothing other than a species of my representations, whose objects are something only through these representations, but are nothing separated from them.
        - b
        - c
        - d
      - e
      - f
    `)

    // Capture the first frame of expansion animation when navigating to the multiline thought
    const firstFrame = await snapshotFirstPaint(async () => {
      await press('ArrowUp')
      await press('ArrowUp')
    })

    expect(firstFrame).toMatchImageSnapshot()

    // For comparison, also take a screenshot after the animation settles
    // (this would be equivalent to the existing test approach)
    await new Promise(resolve => setTimeout(resolve, 100))
    const settledFrame = await screenshot()
    expect(settledFrame).toMatchImageSnapshot()
  })

  it('thought navigation animation first frame', async () => {
    await paste(`
      - first
        - nested1
          - deeply nested
        - nested2
      - second
        - another nested
    `)

    // Capture first paint when navigating between thoughts
    const firstFrame = await snapshotFirstPaint(async () => {
      await press('ArrowDown')
    })

    expect(firstFrame).toMatchImageSnapshot()
  })
})
