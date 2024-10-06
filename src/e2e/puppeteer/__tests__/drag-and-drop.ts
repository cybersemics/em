import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import helpers from '../helpers'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/* From jest-image-snapshot README:
    
  Jest supports automatic retries on test failures. This can be useful for browser screenshot tests which tend to have more frequent false positives. Note that when using jest.retryTimes you'll have to use a unique customSnapshotIdentifier as that's the only way to reliably identify snapshots.

*/

const { paste, removeHUD, screenshot, dragAndDropThought, simulateDragAndDrop, clickThought } = helpers()

describe('drag', () => {
  beforeEach(removeHUD)

  it('DragAndDropThought', async () => {
    await paste(`
        - a
        - b
        - c
        - d
      `)

    await dragAndDropThought('a', 'd', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropChild', async () => {
    await paste(`
        - a
        - b
        - c
        - d
      `)

    await dragAndDropThought('a', 'b', { position: 'child' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropEnd', async () => {
    await paste(`
        - x
        - a
          - b
          - c
      `)

    await clickThought('a')

    await dragAndDropThought('x', 'c', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('DropUncle', async () => {
    await paste(`
        - a
          - b
            - c
              - x
            - d
          - e
      `)

    await clickThought('b')

    // wait for b to expand
    await sleep(100)

    await clickThought('c')

    // wait for c to expand and e to fade out
    await sleep(400)

    await dragAndDropThought('c', 'e', { position: 'before', dropUncle: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after table', async () => {
    await paste(`
        - x
        - a
          - =view
            - Table
          - =pin
            - true
          - b
            - c
          - d
            - e
      `)

    await clickThought('x')

    // Add delay before drag, otherwise the pointer position is sometimes off (intermittend).
    // This is possibly because c is still animating into place, so it throws off the drag-and-drop coordinates.
    // Try removing after animatoins are disabled during tests.
    await sleep(400)

    await dragAndDropThought('x', 'd', { position: 'after', dropUncle: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after column two thought', async () => {
    await paste(`
        - x
        - a
          - =view
            - Table
          - =pin
            - true
          - b
            - c
          - d
            - e
      `)

    await clickThought('x')

    // Add delay before drag, otherwise the pointer position is off (consistent).
    // This is possibly because c is still animating into place, so it throws off the drag-and-drop coordinates.
    // Try removing after animatoins are disabled during tests.
    await sleep(400)

    await dragAndDropThought('x', 'c', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after table column one', async () => {
    await paste(`
        - x
        - a
          - =view
            - Table
          - =pin
            - true
          - b
            - c
          - d
            - e
      `)

    await clickThought('x')
    await dragAndDropThought('x', 'd', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop hover after first thought of column one', async () => {
    await paste(`
        - x
        - a
          - =view
            - Table
          - =pin
            - true
          - b
            - c
          - d
            - e
      `)

    await simulateDragAndDrop({ drop: true })

    await clickThought('x')
    await dragAndDropThought('x', 'd', { position: 'before' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop target last child in cliff', async () => {
    await paste(`
        - a
          - b
            - c
              - d
                - e
                - f
        - x
      `)

    await simulateDragAndDrop({ drop: true })

    await clickThought('a')
    await clickThought('b')
    await dragAndDropThought('e', 'f', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('drop target last visible child', async () => {
    await paste(`
        - a
        - b
        - c
      `)

    await simulateDragAndDrop({ drop: true })

    await dragAndDropThought('b', 'c', { position: 'after' })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })
})

describe('drop', () => {
  beforeEach(removeHUD)

  it('DragAndDropThought', async () => {
    await simulateDragAndDrop({ drag: true, drop: true })

    await paste(`
        - a
        - b
        - c
        - d
      `)

    await dragAndDropThought('a', 'd', { position: 'after', mouseUp: true })

    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  describe('drop targets', () => {
    it('DragAndDropThought and DropChild', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
        - a
        - b
        - c
        - d
      `)

      // wait for .child fade animation
      await sleep(750)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('DropEnd', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
        - a
          - b
            - c
      `)

      await dragAndDropThought('c', 'c', { position: 'after' })

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })

    it('DropUncle', async () => {
      await simulateDragAndDrop({ drop: true })
      await paste(`
        - a
          - b
            - c
              - x
            - d
          - e
      `)

      await clickThought('b')

      // wait for b to expand
      await sleep(100)

      await clickThought('c')

      // wait for c to expand and e to fade out
      await sleep(400)

      const image = await screenshot()
      expect(image).toMatchImageSnapshot()
    })
  })
})
