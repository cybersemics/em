import path from 'path'
import { KnownDevices } from 'puppeteer'
import { HOME_TOKEN } from '../../../constants'
import configureSnapshots from '../configureSnapshots'
import dragAndDropThought from '../helpers/dragAndDropThought'
import emulate from '../helpers/emulate'
import exportThoughts from '../helpers/exportThoughts'
import hideHUD from '../helpers/hideHUD'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

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
    await dragAndDropThought('a', 'x', { position: 'before', mouseUp: true })

    const exported = await exportThoughts()
    expect(exported).toBe(`- ${HOME_TOKEN}
  - y
  - z
  - a
  - x`)
  })

  it('should drop multiple thoughts as siblings after target', async () => {
    await paste(`
      - x
      - y
      - z
      - a
      `)

    await multiselectThoughts(['y', 'z'])
    await dragAndDropThought('z', 'a', { position: 'after', mouseUp: true })

    const exported = await exportThoughts()
    expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
  - y
  - z`)
  })

  it('should drop multiple thoughts as children of target', async () => {
    await paste(`
      - x
      - y
      - z
      - a
      `)

    await multiselectThoughts(['y', 'z'])
    await dragAndDropThought('z', 'a', { position: 'child', mouseUp: true })

    const exported = await exportThoughts()
    expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - y
    - z`)
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
    await dragAndDropThought('y', 'z', { position: 'child', mouseUp: true })

    const exported = await exportThoughts()
    expect(exported).toBe(`- ${HOME_TOKEN}
  - z
    - x
    - y
    - a`)
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
    await dragAndDropThought('e', 'parent', { position: 'child', mouseUp: true })

    const exported = await exportThoughts()
    expect(exported).toBe(`- ${HOME_TOKEN}
  - parent
    - =sort
      - Alphabetical
        - Asc
    - a
    - b
    - c
    - e
    - f`)
  })

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'multiselect' })
  })
})

describe('mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 11'])
  }, 5000)

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    expect(await screenshot()).toMatchImageSnapshot({ customSnapshotIdentifier: 'multiselect-ios' })
  })
})
