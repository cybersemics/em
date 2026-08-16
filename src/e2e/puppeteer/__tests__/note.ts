import click from '../helpers/click'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

// https://github.com/cybersemics/em/issues/4954
it.skip('move thought down with the caret in a note', async () => {
  await paste(`
    - a
      - =note
        - test
    - b
  `)
  await waitForEditable('b')
  await click('[aria-label="note-editable"]')
  await waitUntil(() => document.activeElement?.getAttribute('aria-label') === 'note-editable')

  await press('ArrowDown', { meta: true, shift: true })

  expect(await exportThoughts()).toBe(`
- b
- a
  - =note
    - test
`)
})

// https://github.com/cybersemics/em/issues/4954
it.skip('cursor next with the caret in a note', async () => {
  await paste(`
    - a
      - =note
        - test
      - x
    - b
  `)
  await waitForEditable('b')
  await click('[aria-label="note-editable"]')
  await waitUntil(() => document.activeElement?.getAttribute('aria-label') === 'note-editable')

  await press('ArrowDown', { meta: true })

  await waitUntil(() => document.querySelector('[data-editing=true] [data-editable]')?.textContent !== 'a')
  expect(await getEditingText()).toBe('b')
})
