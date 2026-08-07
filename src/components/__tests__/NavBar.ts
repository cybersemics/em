import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

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

it('does not unescape encoded thought values in ContextBreadcrumbs', async () => {
  await dispatch([
    importText({
      text: `
          - &lt;x y="" z=""&gt;&lt;/x&gt;
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = document.querySelector('[aria-label="context-breadcrumbs"]')!
  expect(contextBreadcrumbs.innerHTML).toContain('&lt;x y="" z=""&gt;&lt;/x&gt;')
  expect(contextBreadcrumbs.innerHTML).not.toContain('<x y="" z=""></x>')
})
