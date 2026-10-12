import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtspaceIdle from '../helpers/waitForThoughtspaceIdle'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

usePersistentTreecrdtStorage()
vi.setConfig({ testTimeout: 60000 })

it('keeps nested edits, moves and undo/redo through a real OPFS reload', async () => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => {
    if (message.type() === 'error' && /TreeCRDT|Thoughtspace persistence|sqlite/i.test(message.text())) {
      errors.push(message.text())
    }
  })
  await paste('- alpha\n  - child\n    - leaf\n- beta')
  await waitForThoughtspaceIdle()
  await refresh()
  await waitForEditable('alpha')
  await command('home')
  await command('cursorNext')
  await waitForCursor('alpha')
  await waitForEditable('child')
  await command('cursorForward')
  await waitForCursor('child')
  await waitForEditable('leaf')
  expect((await exportThoughts()).trim()).toBe('- alpha\n  - child\n    - leaf\n- beta')

  await command('home')
  await command('cursorPrev')
  await waitForCursor('beta')
  await press('End')
  await keyboard.type(' edited')
  await press('Escape')
  await waitForEditable('beta edited')
  await command('cursorPrev')
  await waitForCursor('beta edited')
  await command('moveThoughtUp')
  expect((await exportThoughts()).trim()).toBe('- beta edited\n- alpha\n  - child\n    - leaf')
  await command('undo')
  expect((await exportThoughts()).trim()).toBe('- alpha\n  - child\n    - leaf\n- beta edited')
  await command('redo')
  expect((await exportThoughts()).trim()).toBe('- beta edited\n- alpha\n  - child\n    - leaf')
  await waitForThoughtspaceIdle()

  await refresh()
  await waitForEditable('beta edited')
  await waitForEditable('alpha')
  await command('home')
  await command('cursorPrev')
  await waitForCursor('alpha')
  await waitForEditable('child')
  await command('cursorForward')
  await waitForCursor('child')
  await waitForEditable('leaf')
  expect((await exportThoughts()).trim()).toBe('- beta edited\n- alpha\n  - child\n    - leaf')
  expect(errors).toEqual([])
})
