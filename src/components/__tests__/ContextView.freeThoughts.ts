import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// Lower the threshold to 0 so that freeThoughts deallocates any thought that is not explicitly preserved. vi.mock is hoisted and applies to the whole file, which is why these tests live apart from the rest of the ContextView tests.
vi.mock('../../constants', async importOriginal => ({
  ...(await importOriginal<typeof import('../../constants')>()),
  FREE_THOUGHTS_THRESHOLD: 0,
}))

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Do not deallocate tangential contexts children', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - m
        - d
          - e
            - f
              - m
                - y
                  - y1
                - z
                  - z1
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // Wait for freeThoughts to run before moving the cursor to a/m~/f.
  // Do not dispatch setCursor in the same batch.
  // Otherwise the new state.expanded will incidentally preserve y1 and z1, resulting in a false negative
  await dispatch([setCursor(['a', 'm', 'f'])])

  await act(vi.runOnlyPendingTimersAsync)

  // Wait for a/m~/f/y to be visible
  const y1 = await findThoughtByText('y')
  expect(y1).toBeTruthy()

  // Assert that there are no pending thoughts
  expect(document.querySelectorAll('[data-pending=true]').length).toBe(0)
})
