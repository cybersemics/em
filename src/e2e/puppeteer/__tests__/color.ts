// import { HOME_TOKEN } from '../../../constants'
// import exportContext from '../../../selectors/exportContext'
// import store from '../../../stores/app'
import click from '../../../test-helpers/click'
import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const { setColor, clickThought, paste, waitForEditable } = helpers()

it('Set the text color of the selection', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')

  const result = await setColor('Golden Retriever', 'foreColor', '#ffff00', 1, 4)

  expect(result?.textColor).toBe('#ff0000')
  expect(result?.backColor).toBe(null)
})

it('Set the background color of the selection', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')
  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')
  const result = await setColor('Golden Retriever', 'backColor', 'rgb(255, 0, 0)', 1, 4)
  expect(result?.textColor).toBe(null)
  expect(result?.backColor).toBe('rgb(255, 0, 0)')
})

it('Clear the text color when selecting white', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')

  let result = await setColor('Golden Retriever', 'backColor', '#ffff00', 1, 4)

  expect(result?.textColor).toBe('#ffffff')
  expect(result?.backColor).toBe(null)
})
