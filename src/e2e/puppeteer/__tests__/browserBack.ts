import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000 })

it('browser back button should work correctly after cursor movements', async () => {
  const importText = `
  - a
  - b`

  await paste(importText)

  await waitForEditable('b')
  await clickThought('a')
  await press('ArrowDown')
  await page.goBack()
  await waitForEditable('a')
  await press('ArrowDown')
  await page.goBack()
  const editable = await waitForEditable('a')
  expect(editable).toBeTruthy()
})

it('browser back button should work correctly with complex cursor navigation', async () => {
  const importText = `
  - a
  - b
  - c`

  await paste(importText)

  await waitForEditable('c')
  await clickThought('c')
  await press('ArrowUp')
  await waitForEditable('b')
  await press('ArrowUp')
  await waitForEditable('a')
  await page.goBack()
  await waitForEditable('b')
  await page.goBack()
  await waitForEditable('c')
  await press('ArrowUp')
  await waitForEditable('b')
  await press('ArrowUp')
  await waitForEditable('a')
  await page.goBack()
  await waitForEditable('b')
  const editable = await waitForEditable('b')
  expect(editable).toBeTruthy()
})
