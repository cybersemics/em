import clickThought from '../helpers/clickThought'
import dragAndDropThought from '../helpers/dragAndDropThought'
import exportThoughts from '../helpers/exportThoughts'
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

  it('should not show drop hover above a dragged thought (invalid drop point)', async () => {
    await paste(`
      - a
        - b
      - c
      `)

    // Place the cursor on a to expand it so that b is visible.
    await clickThought('a')

    // Select b and c, then drag c to the first-child position above b.
    // This is an invalid drop point because b is itself being dragged (dropping b before itself is a noop),
    // which aborts the entire multiselect drop. Therefore no drop-hover indicator should be shown.
    await multiselectThoughts(['b', 'c'])
    await dragAndDropThought('c', 'b', { position: 'before', hold: true })

    // Count drop-hover indicators within the main thoughtspace, excluding the unrelated Favorites sidebar.
    const dropHoverCount = await page.evaluate(
      () => Array.from(document.querySelectorAll('.drop-hover')).filter(el => !el.closest('.favorites')).length,
    )

    // release the drag before asserting so the drag state is always cleaned up
    await page.mouse.up()

    expect(dropHoverCount).toBe(0)

    // c should not have moved
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
