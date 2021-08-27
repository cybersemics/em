/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */
import helpers from '../helpers'

jest.setTimeout(20000)

const { paste, press, ref, refresh, waitForEditable, waitForState } = helpers()

// Original issue: #1394
it('sort subthoughts after refresh', async () => {
  await paste(`
    - a
      - =sort
        - Alphabetical
      - c
      - b
    `)

  // set the cursor to null
  await press('Escape')
  await press('Escape')
  await waitForState('isPushing', false)

  // TODO: identify what needs to be waited for specifically
  await new Promise(resolve => setTimeout(resolve, 1000))

  await refresh()

  await waitForEditable('b')

  // we need a little more time to allow Subthoughts to re-render with =sort
  await new Promise(resolve => setTimeout(resolve, 200))

  // get the thought text in document order
  const thoughts = await ref().evaluate(() =>
    [...(document.querySelectorAll('.editable') as unknown as Element[])].map(node => node.textContent),
  )
  expect(thoughts).toEqual(['a', 'b', 'c'])
})

it('hide hidden subthoughts after refresh', async () => {
  await paste(`
    - a
      - Nothing to see here
        - =hidden
      - b
    `)

  // set the cursor to null
  await press('Escape')
  await press('Escape')
  await waitForState('isPushing', false)

  // TODO: identify what needs to be waited for specifically
  await new Promise(resolve => setTimeout(resolve, 1000))

  await refresh()

  await waitForEditable('b')

  // we need a little more time to allow Subthoughts to re-render with =sort
  await new Promise(resolve => setTimeout(resolve, 200))

  // get the thought text in document order
  const thoughts = await ref().evaluate(() =>
    [...(document.querySelectorAll('.editable') as unknown as Element[])].map(node => node.textContent),
  )
  expect(thoughts).toEqual(['a', 'b'])
})
