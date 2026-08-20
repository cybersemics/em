import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import paste from '../helpers/paste'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
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

  await Promise.all([waitForThoughtExistInDb('m'), waitForThoughtExistInDb('a')])

  await refresh()

  await waitForEditable('m')

  await clickThought('m')
  await clickToolbar('Context View')

  // assert that c is loaded
  await waitForEditable('c')
})
