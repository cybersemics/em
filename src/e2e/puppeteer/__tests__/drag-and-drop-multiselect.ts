import dragAndDropThought from '../helpers/dragAndDropThought'
import exportThoughts from '../helpers/exportThoughts'
import hideHUD from '../helpers/hideHUD'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'

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
