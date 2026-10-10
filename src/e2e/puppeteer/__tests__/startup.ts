import deferThoughtspaceInitialization from '../helpers/deferThoughtspaceInitialization'
import getEditingText from '../helpers/getEditingText'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 30000, hookTimeout: 20000 })

it('ignores keyboard editing until thoughtspace initialization succeeds', async () => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(String(error)))
  const resumeInitialization = await deferThoughtspaceInitialization()

  await press('Enter')

  await waitForSelector('[aria-label=thoughtspace-startup]')
  expect(await getEditingText()).toBeUndefined()
  expect(errors).toEqual([])

  await resumeInitialization()
  await waitForSelector('[aria-label=empty-thoughtspace]')
  expect(await getEditingText()).toBeUndefined()

  await press('Enter')

  await waitForEditable('')
  expect(await getEditingText()).toBe('')
  expect(errors).toEqual([])
})
