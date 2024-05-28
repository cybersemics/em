import { act } from '@testing-library/react'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findThoughtByText } from '../../test-helpers/queries'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('headings should set font weight', async () => {
  await act(async () => {
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
  })

  // normal text should not be bold
  const thought0 = await findThoughtByText('Normal Text')
  expect(thought0).not.toHaveStyle({ fontWeight: 700 })

  // headings should be bold
  const thought1 = (await findThoughtByText('My Heading 1'))?.closest('[aria-label="child"]')
  expect(thought1).toHaveStyle({ fontWeight: 700 })

  const thought2 = (await findThoughtByText('My Heading 2'))?.closest('[aria-label="child"]')
  expect(thought2).toHaveStyle({ fontWeight: 700 })

  const thought3 = (await findThoughtByText('My Heading 3'))?.closest('[aria-label="child"]')
  expect(thought3).toHaveStyle({ fontWeight: 700 })

  const thought4 = (await findThoughtByText('My Heading 4'))?.closest('[aria-label="child"]')
  expect(thought4).toHaveStyle({ fontWeight: 600 })

  const thought5 = (await findThoughtByText('My Heading 5'))?.closest('[aria-label="child"]')
  expect(thought5).toHaveStyle({ fontWeight: 600 })

  // child should not be bold
  await act(async () => {
    store.dispatch(setCursor(['My Heading 1', '=heading1']))
  })

  const thought1Child = await findThoughtByText('=heading1')
  expect(thought1Child).not.toHaveStyle({ fontWeight: 700 })
})
