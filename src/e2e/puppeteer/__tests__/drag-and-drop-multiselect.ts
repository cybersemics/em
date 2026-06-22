import clickThought from '../helpers/clickThought'
import dragAndDropThought from '../helpers/dragAndDropThought'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import hideHUD from '../helpers/hideHUD'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import { page } from '../setup'

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

describe('drag and drop multiple thoughts', () => {
  beforeEach(async () => {
    await hideHUD()
  })

  it('should drop multiple thoughts as siblings before target', async () => {
    await paste(`
      - x
      - y
      - z
      - a
      `)

    await multiselectThoughts(['y', 'z', 'a'])
    await dragAndDropThought('a', 'x', { position: 'before' })

    const exported = await exportThoughts()
    expect(exported).toBe(`
- y
- z
- a
- x
`)
  })

  it('should drop multiple thoughts as siblings after target', async () => {
    await paste(`
      - x
      - y
      - z
      - a
      `)

    await multiselectThoughts(['y', 'z'])
    await dragAndDropThought('z', 'a', { position: 'after' })

    const exported = await exportThoughts()
    expect(exported).toBe(`
- x
- a
- y
- z
`)
  })

  it('should drop multiple thoughts as children of target', async () => {
    await paste(`
      - x
      - y
      - z
      - a
      `)

    await multiselectThoughts(['y', 'z'])
    await dragAndDropThought('z', 'a', { position: 'child' })

    const exported = await exportThoughts()
    expect(exported).toBe(`
- x
- a
  - y
  - z
`)

    // After the drop, the transient drag UI should be dismissed and the cursor restored — asserted via user-observable DOM, not the Redux store (#4348).

    // 1. the multicursor selection (and, on mobile, the Command Center / bullet drag highlight) is dismissed: no bullets remain highlighted
    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    expect(highlightedBullets.length).toBe(0)

    // 2. the "Drag and drop to move thought" hint alert is dismissed
    const alertContent = await page.$eval('[data-testid=alert-content]', el => el.textContent).catch(() => null)
    expect(alertContent).not.toContain('Drag and drop to move thought')

    // 3. the cursor is placed on the drop target
    expect(await getEditingText()).toBe('a')
  })

  it('should preserve document order of multiselected thoughts when dropping', async () => {
    await paste(`
      - x
      - y
      - z
      - a
      `)

    // Select in random order: a, x, y
    await multiselectThoughts(['a', 'x', 'y'])
    await dragAndDropThought('y', 'z', { position: 'child' })

    const exported = await exportThoughts()
    expect(exported).toBe(`
- z
  - x
  - y
  - a
`)
  })

  it('should drop a multiselected thought and subthought as the first children, preserving document order', async () => {
    await paste(`
      - a
        - b
      - c
      `)

    // expand a so that its child b is visible
    await clickThought('a')

    // select the subthought b and the sibling c
    await multiselectThoughts(['b', 'c'])

    // drop c above b (the first child of a). b above itself is a no-op, but c should still move.
    await dragAndDropThought('c', 'b', { position: 'before' })

    const exported = await exportThoughts()
    expect(exported).toBe(`
- a
  - b
  - c
`)
  })

  it('should handle multiselect drag to sorted context - multiple drop positions', async () => {
    await paste(`
        - b
        - e
        - parent
          - =sort
            - Alphabetical
              - Asc
          - a
          - c
          - f
        `)

    // Drag b and e into the sorted context
    await multiselectThoughts(['e', 'b'])
    await dragAndDropThought('e', 'parent', { position: 'child' })

    const exported = await exportThoughts()
    expect(exported).toBe(`
- parent
  - =sort
    - Alphabetical
      - Asc
  - a
  - b
  - c
  - e
  - f
`)
  })
})
