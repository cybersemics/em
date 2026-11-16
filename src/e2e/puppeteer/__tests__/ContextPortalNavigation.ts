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
import waitForSelector from '../helpers/waitForSelector'

vi.setConfig({ testTimeout: 20000 })

it('Close Portal from the Command Universe preserves the destination thought and its native caret', async () => {
  const thoughts = `
- Shared concept
  - Source detail
- Archive
  - Topics
    - Designer
      - Shared concept
        - Target detail
`
  await paste(thoughts)
  await clickThought('Shared concept')
  await clickToolbar('Context View')
  await click('[aria-label="Uncollapse Topics"]')
  await clickThought('Designer')
  await press('ArrowDown')
  await waitForCursor('Shared concept')

  const target = await waitForEditable('Target detail')
  await click(target, { offset: 4 })
  await waitForCursor('Target detail')
  expect(await getCaretOffset()).toBe(4)

  // Query the real palette by text so this test also compiles against the pre-command TDD base.
  await press('P', { meta: true })
  await waitForSelector('[data-testid=desktop-command-universe]')
  await keyboard.type('Close Portal')
  await press('Enter')
  // The Command Universe restores selection when its closing animation unmounts it.
  await waitForSelector('[data-testid=desktop-command-universe]', { hidden: true })
  await waitForCursor('Target detail')
  expect(await getCaretOffset()).toBe(4)

  await waitForSelector('[aria-label="Uncollapse Archive"]', { hidden: true })
  await waitForSelector('[aria-label="Uncollapse Topics"]', { hidden: true })
  // The ordinary destination branch keeps its nearby ancestor visible; autofocus hides distant ancestors.
  await waitForEditable('Designer')
  expect(await exportThoughts()).toBe(thoughts)
})
