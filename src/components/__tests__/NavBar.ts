import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Strip formatting from thought values in ContextBreadcrumbs', async () => {
  await dispatch([
    importText({
      text: `
          - <b>test</b>
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = document.querySelector('[aria-label="context-breadcrumbs"]')!
  expect(contextBreadcrumbs.textContent).toBe('test')
})

// https://github.com/cybersemics/em/issues/5855
it('shows the empty-thought placeholder for an empty cursor thought', async () => {
  await dispatch([
    importText({
      text: `
- a
  - b
  -
`,
    }),
  ])
  vi.setSystemTime(Date.now() + 5001)
  await dispatch([setCursor(['a', ''])])

  await act(vi.runOnlyPendingTimersAsync)

  const breadcrumbs = Array.from(
    document.querySelectorAll('[aria-label="nav"] [aria-label="context-breadcrumbs"] [data-thought-link]'),
  ).map(link => link.textContent)
  expect(breadcrumbs).toEqual(['a', 'This is an empty thought'])
})
