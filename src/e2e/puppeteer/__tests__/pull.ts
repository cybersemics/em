import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000 })

const { $, clickThought, paste, press, refresh, waitForEditable, waitForThoughtExistInDb } = helpers()

// TODO: Fix thought buffering after switch to YJS
it.skip('load a child after a parent is expanded', async () => {
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
  expect(await $('.graypulse')).toBeFalsy()

  await waitForThoughtExistInDb('a')
  await waitForThoughtExistInDb('b')
  await waitForThoughtExistInDb('c')
  await waitForThoughtExistInDb('d')
  await waitForThoughtExistInDb('e')
  await refresh()

  // wait for a re-render in case the lexeme was loaded after the parent
  // getEditingText will return undefined if we don't wait
  // we don't currently have a way to tell if a lexeme is missing or just loading
  await new Promise(resolve => setTimeout(resolve, 100))

  // expand b
  await clickThought('b')
  await waitForEditable('d')

  // d should now be pending
  const isPendingBeforeExpand = !!(await $('.graypulse'))
  expect(isPendingBeforeExpand).toEqual(true)

  await new Promise(resolve => setTimeout(resolve, 500))
  const isPendingAfterExpand = !!(await $('.graypulse'))

  // all visible thoughts, including d, should be loaded now
  expect(isPendingAfterExpand).toEqual(false)
})
