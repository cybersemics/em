import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import exportThoughts from '../helpers/exportThoughts'
import getCaretOffset from '../helpers/getCaretOffset'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000 })

it('edits an unfolded destination ancestor with the real caret and restores its tree on undo', async () => {
  await paste(`
- Shared concept
  - Source detail
- Archive
  - Topics
    - Design
      - Designer
        - Shared concept
          - Target detail
        - Unrelated sibling
`)
  await clickThought('Shared concept')
  await clickToolbar('Context View')

  await click('[aria-label="Uncollapse Topics"]')
  const design = await waitForEditable('Design')
  await click(design, { offset: 6 })
  await waitForCursor('Design')
  expect(await getCaretOffset()).toBe(6)

  await keyboard.type(' revised')
  await waitForEditable('Design revised')
  expect(await getCaretOffset()).toBe(14)
  await press('Enter')
  await waitForCursor('')
  await keyboard.type('Added sibling')
  await waitForEditable('Added sibling')
  // Leaving the editable commits its throttled text before the physical tree is exported.
  await press('Escape')
  await waitForCursor('Topics')

  expect(await exportThoughts()).toBe(`
- Shared concept
  - Source detail
- Archive
  - Topics
    - Design revised
      - Designer
        - Shared concept
          - Target detail
        - Unrelated sibling
    - Added sibling
`)

  await press('z', { meta: true })
  await waitForCursor('')
  await press('z', { meta: true })
  await waitForCursor('Design revised')
  await press('z', { meta: true })
  await waitForCursor('Design')

  expect(await exportThoughts()).toBe(`
- Shared concept
  - Source detail
- Archive
  - Topics
    - Design
      - Designer
        - Shared concept
          - Target detail
        - Unrelated sibling
`)
})
