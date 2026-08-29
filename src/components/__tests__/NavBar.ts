import { act } from 'react'
import { alertActionCreator as alert } from '../../actions/alert'
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
          - &lt;one two&gt;
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = document.querySelector('[aria-label="context-breadcrumbs"]')!
  expect(contextBreadcrumbs.innerHTML).toContain('&lt;one two&gt;')
  expect(contextBreadcrumbs.innerHTML).not.toContain('&lt;one two=""&gt;&lt;/one&gt;')
  expect(contextBreadcrumbs.textContent).toContain('<one two>')
  expect(contextBreadcrumbs.textContent).not.toContain('<one two=""></one>')
})

it('does not strip angle-bracket thought values from move alerts', async () => {
  await dispatch([alert('"<aaa>" moved to "bbb".')])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"<aaa>" moved to "bbb".')
})
