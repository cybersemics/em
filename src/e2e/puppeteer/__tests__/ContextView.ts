import sleep from '../../../util/sleep'
import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000 })

const { click, paste, refresh, waitForEditable, waitForThoughtExistInDb, clickThought } = helpers()

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
  await sleep(100)

  await clickThought('m')
  await click('.toolbar-icon[aria-label="Context View"]')

  // allow ancestors to be loaded
  // may not be practically necessary, but there could be a delay on slower machines
  await sleep(10)

  // assert that c is loaded
  await waitForEditable('c')
})
