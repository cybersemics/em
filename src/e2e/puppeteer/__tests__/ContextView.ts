import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import paste from '../helpers/paste'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 20000 })
usePersistentTreecrdtStorage()

// using a puppeteer test since I can't get refresh to work in RTL tests
it('load buffered ancestors of contexts when context view is activated', async () => {
  const importText = `
    - m
    - a
      - b
        - c
          - m
    `
  await paste(importText)
  await waitForEditable('m')
  await clickThought('m')

  await refresh()

  // Startup after a reload opens the OPFS database and hydrates the thought, which can take longer than the default 6 s.
  await waitForEditable('m', { timeout: 10000 })

  await clickThought('m')
  await clickToolbar('Context View')

  // assert that c is loaded
  await waitForEditable('c')
})
