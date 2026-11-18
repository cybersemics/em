import exportThoughts from '../helpers/exportThoughts'
import press from '../helpers/press'
import setClipboard from '../helpers/setClipboard'
import waitForEditable from '../helpers/waitForEditable'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })

// Persisting each thought is what makes an import slow enough to still be running when the app resumes the imports a
// previous session left unfinished, half a second after the thoughts load.
usePersistentTreecrdtStorage()

/** Returns an outline of the given values, indented by the given number of levels. */
const outline = (values: string[], depth = 0) => values.map(value => `${'  '.repeat(depth)}- ${value}`).join('\n')

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
