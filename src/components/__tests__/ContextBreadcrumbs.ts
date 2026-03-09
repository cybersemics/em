import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('strips HTML tags from breadcrumbs', async () => {
  await dispatch([
    importText({
      text: `
- A
  - B
    - C
      - =favorite
`,
    }),
    editThought(['A', 'B'], '<font color="#ffffff"><b><i>B</i></b></font>'),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  await dispatch([setCursor(['A', 'B', 'C'])])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = Array.from(
    document.querySelectorAll('[data-testid="favorites"] [aria-label="context-breadcrumbs"] [role="button"]'),
  ).map(breadcrumb => breadcrumb.innerHTML)

  expect(contextBreadcrumbs).toEqual(['A', 'B'])
})
