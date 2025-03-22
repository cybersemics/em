import sleep from '../../../util/sleep'
import dragAndDropThought from '../helpers/dragAndDropThought'
import hideHUD from '../helpers/hideHUD'
import isElementVisible from '../helpers/isElementVisible'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

// Set a longer timeout for drag operations
vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('Auto-expansion and collapse during drag operations', () => {
  beforeEach(hideHUD)

  // Clean up after each test by releasing the mouse button
  afterEach(async () => {
    try {
      // Release mouse button if it's still down
      await page.mouse.up()
      // Add a small delay to ensure the UI updates
      await sleep(500)
    } catch (err) {
      console.error('Error during test cleanup:', err)
    }
  })

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

    // Verify that A1 and A2 are visible (A has expanded)
    const a1Editable = await waitForEditable('A1', { timeout: 2000 })
    const a2Editable = await waitForEditable('A2', { timeout: 2000 })

    expect(a1Editable).toBeTruthy()
    expect(a2Editable).toBeTruthy()
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

    // Verify that A1 and A2 are visible (A has expanded)
    const a1Editable = await waitForEditable('A1')
    const a2Editable = await waitForEditable('A2')

    expect(a1Editable).toBeTruthy()
    expect(a2Editable).toBeTruthy()

    // Now drag to thought B instead
    await dragAndDropThought('C', 'B', {
      position: 'after',
      mouseUp: false,
      skipMouseDown: true,
    })

    await sleep(1000)

    // Verify that A1 and A2 are no longer visible (A has collapsed)
    const a1Visible = await isElementVisible('A1')
    const a2Visible = await isElementVisible('A2')

    expect(a1Visible).toBe(false)
    expect(a2Visible).toBe(false)
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

    // Verify that A1 and A2 are visible (A has expanded)
    const a1Editable = await waitForEditable('A1', { timeout: 2000 })
    const a2Editable = await waitForEditable('A2', { timeout: 2000 })

    expect(a1Editable).toBeTruthy()
    expect(a2Editable).toBeTruthy()

    // Now move to A1 using the dragAndDropThought function with skipMouseDown
    await dragAndDropThought('C', 'A1', {
      position: 'child',
      mouseUp: false,
      skipMouseDown: true, // Skip pressing the mouse button down again
    })

    // Wait for A1 to expand
    await sleep(1000)

    // Verify that A1-1 and A1-2 are visible (A1 has expanded)
    const a11Editable = await waitForEditable('A1-1', { timeout: 2000 })
    const a12Editable = await waitForEditable('A1-2', { timeout: 2000 })

    expect(a11Editable).toBeTruthy()
    expect(a12Editable).toBeTruthy()

    // Now drag to A2
    await dragAndDropThought('C', 'A2', {
      position: 'child',
      mouseUp: false,
      skipMouseDown: true, // Skip pressing the mouse button down again
    })

    // Wait for any state changes
    await sleep(1000)

    // Verify that A1-1 and A1-2 are no longer visible (A1 has collapsed)
    const a11Visible = await isElementVisible('A1-1')
    const a12Visible = await isElementVisible('A1-2')

    expect(a11Visible).toBe(false)
    expect(a12Visible).toBe(false)

    // Now drag completely away to B
    await dragAndDropThought('C', 'B', {
      position: 'after',
      mouseUp: false,
      skipMouseDown: true,
    })

    await sleep(1000)

    // Verify that all A's children (A1 and A2) are no longer visible (A has collapsed)
    const a1Visible = await isElementVisible('A1')
    const a2Visible = await isElementVisible('A2')

    expect(a1Visible).toBe(false)
    expect(a2Visible).toBe(false)
  })
})
