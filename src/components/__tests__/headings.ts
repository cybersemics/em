import importText from '../../action-creators/importText'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { findThoughtByText } from '../../test-helpers/queries'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('headings should set font weight', async () => {
  store.dispatch([
    importText({
      text: `
        - Normal Text
        - My Heading 1
          - =heading1
        - My Heading 2
          - =heading2
        - My Heading 3
          - =heading3
        - My Heading 4
          - =heading4
        - My Heading 5
          - =heading5
      `,
    }),
  ])

  // normal text should not be bold
  const thought0 = await findThoughtByText('Normal Text')
  expect(thought0).not.toHaveStyle({ fontWeight: 700 })

  // headings should be bold
  const thought1 = await findThoughtByText('My Heading 1')
  expect(thought1).toHaveStyle({ fontWeight: 700 })

  const thought2 = await findThoughtByText('My Heading 2')
  expect(thought2).toHaveStyle({ fontWeight: 700 })

  const thought3 = await findThoughtByText('My Heading 3')
  expect(thought3).toHaveStyle({ fontWeight: 700 })

  const thought4 = await findThoughtByText('My Heading 4')
  expect(thought4).toHaveStyle({ fontWeight: 600 })

  const thought5 = await findThoughtByText('My Heading 5')
  expect(thought5).toHaveStyle({ fontWeight: 600 })

  // child should not be bold
  store.dispatch(setCursorFirstMatchActionCreator(['My Heading 1', '=heading1']))
  const thought1Child = await findThoughtByText('=heading1')
  expect(thought1Child).not.toHaveStyle({ fontWeight: 700 })
})
