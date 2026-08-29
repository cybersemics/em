import { act, createElement } from 'react'
import { alertActionCreator as alert } from '../../actions/alert'
import { importTextActionCreator as importText } from '../../actions/importText'
import MoveThoughtAlert from '../../components/MoveThoughtAlert'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'

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

it('normalizes unknown html tags in move alerts', async () => {
  await dispatch([alert('"bbb" moved to "<aaa></aaa>".')])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"bbb" moved to "<aaa>".')
  expect(alertContent.textContent).not.toContain('<aaa></aaa>')
})

it('strips formatting tags from move alerts', async () => {
  await dispatch([alert('"<font color="#ff573d"><b>aaa</b></font>" moved to "bbb".')])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"aaa" moved to "bbb".')
  expect(alertContent.textContent).not.toContain('<font')
})

it('strips formatting tags from move alert destination label in reversed drag case', async () => {
  await dispatch([
    importText({
      text: `
          - aaa
          - bbb
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const toPath = contextToPathOrThrow(store.getState(), ['aaa'])

  await dispatch([editThought(['aaa'], '<font color="#ff573d"><b>aaa</b></font>')])

  await dispatch([alert(() => createElement(MoveThoughtAlert, { from: 'bbb', toPath }))])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"bbb" moved to "aaa".')
  expect(alertContent.textContent).not.toContain('<font')
})

it('does not show serialized closing tags in ContextBreadcrumbs', async () => {
  await dispatch([
    importText({
      text: `
          - parent
            - child
      `,
    }),
    editThought(['parent'], '<aaa></aaa>'),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = document.querySelector('[aria-label="context-breadcrumbs"]')!
  expect(contextBreadcrumbs.textContent).toContain('<aaa>')
  expect(contextBreadcrumbs.textContent).not.toContain('</aaa>')
})
