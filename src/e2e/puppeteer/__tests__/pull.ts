import $ from '../helpers/$'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import waitUntil from '../helpers/waitUntil'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 20000 })
usePersistentTreecrdtStorage()

it('load a child after a parent is expanded', async () => {
  const text = `
    - a
    - b
      - c
      - d
        - e
  `
  await paste(text)
  await waitForEditable('b')
  await press('Escape')

  // no thoughts are pending after paste
  expect(await $('[data-pending=true]')).toBeFalsy()

  await waitForThoughtExistInDb('a')
  await waitForThoughtExistInDb('b')
  await waitForThoughtExistInDb('c')
  await waitForThoughtExistInDb('d')
  await waitForThoughtExistInDb('e')
  await refresh()

  // wait for the root thoughts to be rendered after the refresh
  await waitForEditable('b')

  // expand b
  await clickThought('b')
  await waitForEditable('d')

  // d should now be pending, since its children have not been pulled yet
  const isPendingBeforeExpand = !!(await $('[data-pending=true]'))
  expect(isPendingBeforeExpand).toEqual(true)

  // all visible thoughts, including d, should be loaded shortly after being rendered
  await waitUntil(() => !document.querySelector('[data-pending=true]'))
  expect(await $('[data-pending=true]')).toBeFalsy()
})
