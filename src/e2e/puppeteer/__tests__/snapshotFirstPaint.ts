import path from 'path'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import snapshotFirstPaint, { snapshotAnimationFrames } from '../helpers/snapshotFirstPaint'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

describe('snapshotFirstPaint', () => {
  beforeEach(hideHUD)

  it('captures first animation frame after user interaction', async () => {
    // Set up some thoughts to interact with
    await paste(`
      - a
        - b
          - c
    `)

    // Take a baseline screenshot before interaction
    const beforeImage = await screenshot()
    expect(beforeImage).toMatchImageSnapshot()

    // Capture the first paint after clicking to expand/collapse a thought
    // This should capture the initial frame of any animation that occurs
    const firstPaintImage = await snapshotFirstPaint(async () => {
      await clickThought('a')
    })

    expect(firstPaintImage).toMatchImageSnapshot()
  })

  it('captures multiple animation frames', async () => {
    // Set up thoughts with more complex structure for multi-frame animation
    await paste(`
      - parent
        - child1
          - grandchild1
          - grandchild2
        - child2
          - grandchild3
    `)

    // Capture multiple frames of animation progression
    const frames = await snapshotAnimationFrames(
      async () => {
        await clickThought('parent')
      },
      2, // Capture first 2 frames
    )

    // Test each frame
    frames.forEach((frame, i) => {
      expect(frame).toMatchImageSnapshot({
        customSnapshotIdentifier: `animation-frame-${i + 1}`,
      })
    })
  })

  it('demonstrates animation state capture with context view toggle', async () => {
    // Set up thoughts with context for toggle interaction
    await paste(`
      - x
        - a
        - b
      - y
        - a
        - c
    `)

    // Click on 'a' to show it in the cursor
    await clickThought('a')

    // Capture first paint of context view toggle animation
    const firstPaintImage = await snapshotFirstPaint(async () => {
      // Trigger context view (Alt+click or specific gesture)
      // For now, we'll use a simple click as a demonstration
      await clickThought('a', { altKey: true })
    })

    expect(firstPaintImage).toMatchImageSnapshot()
  })
})
