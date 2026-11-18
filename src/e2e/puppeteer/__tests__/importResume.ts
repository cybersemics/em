import exportThoughts from '../helpers/exportThoughts'
import press from '../helpers/press'
import setClipboard from '../helpers/setClipboard'
import waitForAlert from '../helpers/waitForAlert'
import waitForEditable from '../helpers/waitForEditable'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })

// Persisting each thought is what makes an import slow enough to still be running when the app resumes the imports a
// previous session left unfinished, half a second after the thoughts load.
usePersistentTreecrdtStorage()

const values = Array.from({ length: 30 }, (_, i) => `t${i + 1}`)
const text = values.map(value => `- ${value}`).join('\n')

// https://github.com/cybersemics/em/pull/6296
it('imports a paste made as soon as the app loads only once', async () => {
  await press('Enter')
  await waitForEditable('')

  await setClipboard({ text })
  await press('Insert', { shift: true })
  await waitForAlert('100.0%', { timeout: 30000 })

  expect(await exportThoughts()).toBe(`
${values.map(value => `- ${value}`).join('\n')}
`)
})
