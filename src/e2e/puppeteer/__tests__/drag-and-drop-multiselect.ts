import { WindowEm } from '../../../initialize'
import dragAndDropThought from '../helpers/dragAndDropThought'
import exportThoughts from '../helpers/exportThoughts'
import hideHUD from '../helpers/hideHUD'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import { page } from '../setup'

const em = window.em as WindowEm

/** Returns the number of active multicursors. */
const getNumMulticursors = () => page.evaluate(() => Object.keys(em.testHelpers.getState().multicursors).length)

/** Returns the current longPress drag state. */
const getLongPressState = () => page.evaluate(() => em.testHelpers.getState().longPress)

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

    // the multicursor selection (and the Command Center on mobile) should be dismissed after the drop (#4348)
    expect(await getNumMulticursors()).toBe(0)

    // the long press / drag state should be reset after the drop so the dragged thought's bullet selection indicator is dismissed (#4348)
    expect(await getLongPressState()).toBe('Inactive')
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
