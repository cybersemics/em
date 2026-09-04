import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForSuperscript from '../helpers/waitForSuperscript'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })
usePersistentTreecrdtStorage()

// https://github.com/cybersemics/em/issues/5353
it.skip('show the superscript after editing a thought to match a thought that has not been loaded', async () => {
  await paste(`
    - x
    - a
      - b
        - c
          - d
  `)
  await clickThought('x')

  // reload so that the deeply nested d and its Lexeme are not loaded
  await refresh()
  await waitForEditable('x')

  // edit x to d
  await click(await waitForEditable('x'), { edge: 'right' })
  await press('Backspace')
  await keyboard.type('d')
  await waitForEditable('d')

  // d now occurs in two contexts: the root and a/b/c
  expect(await waitForSuperscript()).toBe('2')
})
