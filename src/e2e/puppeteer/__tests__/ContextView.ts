import sleep from '../../../util/sleep'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import refresh from '../helpers/refresh'
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

  // wait for a re-render in case the lexeme was loaded after the parent
  // getEditingText will return undefined if we don't wait
  // we don't currently have a way to tell if a lexeme is missing or just loading
  await sleep(1000)

  await clickThought('m')
  await scrollIntoView('[data-testid="toolbar-icon"][aria-label="Settings"]')
  await sleep(1000)
  await click('[data-testid="toolbar-icon"][aria-label="Context View"]')

  // allow ancestors to be loaded
  // may not be practically necessary, but there could be a delay on slower machines
  await sleep(1000)

  // assert that c is loaded
  await waitForEditable('c')
})
