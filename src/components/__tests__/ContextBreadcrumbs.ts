import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('strips HTML tags from breadcrumbs', async () => {
  await dispatch([
    importText({
      text: `
- A
  - <font style="fff">B</font>
    - C
`,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  await dispatch([setCursor(['A', 'B', 'C'])])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = document.querySelector('[aria-label="context-breadcrumbs"]')

  expect(contextBreadcrumbs?.textContent).toEqual('A • B • C')
})
