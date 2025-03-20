import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import dragAndDropThought from '../helpers/dragAndDropThought'
import hideHUD from '../helpers/hideHUD'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

// Set a longer timeout for drag operations
vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('Auto-expansion and collapse during drag operations', () => {
  beforeEach(hideHUD)

  it('expands a thought on hover down during drag', async () => {
    await paste(`
        - A
          - A1
          - A2
        - B
        - C
        `)

    // Start dragging thought C
    await dragAndDropThought('C', 'A', {
      position: 'child',
      mouseUp: false, // Don't complete the drag yet
    })

    // Wait for expansion to occur
    await sleep(1000)

    // Take a screenshot
    const image = await screenshot()
    expect(image).toMatchImageSnapshot()
  })

  it('collapses a thought when dragging away', async () => {
    await paste(`
          - A
            - A1
            - A2
          - B
          - C
          `)
    // First expand thought A by dragging over it
    await dragAndDropThought('C', 'A', {
      position: 'child',
      mouseUp: false,
    })

    // Wait for expansion to occur
    await sleep(1000)

    const AExpanded = await screenshot()
    expect(AExpanded).toMatchImageSnapshot()

    // Now drag to thought B instead
    await dragAndDropThought('C', 'B', {
      position: 'after',
      mouseUp: false,
      skipMouseDown: true,
    })

    await sleep(1000)

    // Take a screenshot
    const imageCollapsed = await screenshot()
    expect(imageCollapsed).toMatchImageSnapshot()
  })

  it('collapses nested thoughts when dragging away', async () => {
    await paste(`
    - A
      - A1
        - A1-1
        - A1-2
      - A2
    - B
    - C
    `)

    // First expand thought A by dragging over it
    await dragAndDropThought('C', 'A', {
      position: 'child',
      mouseUp: false,
    })

    // Wait for expansion to occur
    await sleep(1000)

    const AExpanded = await screenshot()
    expect(AExpanded).toMatchImageSnapshot()

    // Now move to A1 using the dragAndDropThought function with skipMouseDown
    await dragAndDropThought('C', 'A1', {
      position: 'child',
      mouseUp: false,
      skipMouseDown: true, // Skip pressing the mouse button down again
    })

    // Wait for A1 to expand
    await sleep(1000)

    // Take screenshot of both A and A1 expanded
    const AAndA1Expanded = await screenshot()
    expect(AAndA1Expanded).toMatchImageSnapshot()

    // Now drag to A2
    await dragAndDropThought('C', 'A2', {
      position: 'child',
      mouseUp: false,
      skipMouseDown: true, // Skip pressing the mouse button down again
    })

    // Wait for any state changes
    await sleep(1000)

    const a1Collapsed = await screenshot()
    expect(a1Collapsed).toMatchImageSnapshot()

    // Now drag completely away to B
    await dragAndDropThought('C', 'B', {
      position: 'after',
      mouseUp: false,
      skipMouseDown: true,
    })

    await sleep(1000)

    // Take screenshot of final state
    const imageCollapsed = await screenshot()
    expect(imageCollapsed).toMatchImageSnapshot()
  })
})
