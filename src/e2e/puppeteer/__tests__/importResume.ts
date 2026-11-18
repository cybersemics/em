import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import setClipboard from '../helpers/setClipboard'
import waitForAlert from '../helpers/waitForAlert'
import waitForEditable from '../helpers/waitForEditable'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })

// Persisting each thought is what makes an import slow enough to still be running when the page is refreshed, and when
// the app resumes the imports a previous session left unfinished, half a second after the thoughts load.
usePersistentTreecrdtStorage()

/** Returns an outline of the given values, indented by the given number of levels. */
const outline = (values: string[], depth = 0) => values.map(value => `${'  '.repeat(depth)}- ${value}`).join('\n')

// https://github.com/cybersemics/em/issues/5174
it('resumes an interrupted paste after a refresh', async () => {
  const children = Array.from({ length: 10 }, (_, i) => `t${i + 1}`)
  const siblings = Array.from({ length: 5 }, (_, i) => `u${i + 1}`)

  await paste(`
    - x
  `)
  await clickThought('x')
  await press('Enter')
  await waitForEditable('')

  await setClipboard({ text: `- a\n${outline(children, 1)}\n${outline(siblings)}` })
  await press('Insert', { shift: true })
  // refresh partway through the children of a, so that the import resumes them into the a it imported before the refresh
  await waitForEditable('t7', { timeout: 20000 })

  await refresh()
  await waitForAlert('Importing from clipboard', { timeout: 20000 })
  // The final progress alert is cleared as soon as the import finishes, so it can be cleared before it is seen. Wait for
  // the last thought instead.
  await waitForEditable('u5', { timeout: 30000 })

  expect(await exportThoughts()).toBe(`
- x
- a
${outline(children, 1)}
${outline(siblings)}
`)
})

it('imports a paste made as soon as the app loads only once', async () => {
  const values = Array.from({ length: 10 }, (_, i) => `t${i + 1}`)

  await press('Enter')
  await waitForEditable('')

  await setClipboard({ text: outline(values) })
  await press('Insert', { shift: true })
  // The final progress alert is cleared as soon as the import finishes, so it can be cleared before it is seen. Wait for
  // the last thought instead.
  await waitForEditable('t10', { timeout: 30000 })

  expect(await exportThoughts()).toBe(`
${outline(values)}
`)
})
