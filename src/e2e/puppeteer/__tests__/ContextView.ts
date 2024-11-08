import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import refresh from '../helpers/refresh'
import scrollBy from '../helpers/scrollBy'
import scrollIntoView from '../helpers/scrollIntoView'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'

vi.setConfig({ testTimeout: 20000 })

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
  await scrollIntoView('[data-testid="toolbar-icon"][aria-label="Context View"]')
  await scrollBy('#toolbar', 50, 0)
  await click('[data-testid="toolbar-icon"][aria-label="Context View"]')

  // assert that c is loaded
  await waitForEditable('c')
})
