import { act, createElement } from 'react'
import { alertActionCreator as alert } from '../../actions/alert'
import { importTextActionCreator as importText } from '../../actions/importText'
import MoveThoughtAlert from '../../components/MoveThoughtAlert'
import { HOME_PATH } from '../../constants'
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
  await dispatch([
    importText({
      text: `
          - bbb
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const toPath = contextToPathOrThrow(store.getState(), ['bbb'], 'NavBar test')

  await dispatch([alert(() => createElement(MoveThoughtAlert, { from: '&lt;aaa&gt;', toPath }))])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"<aaa>" moved to "bbb".')
})

it('preserves explicit closing tags in ContextBreadcrumbs', async () => {
  await dispatch([
    importText({
      text: `
          - parent
            - child
      `,
    }),
    editThought(['parent'], '&lt;foo&gt;&lt;/foo&gt;'),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = document.querySelector('[aria-label="context-breadcrumbs"]')!
  expect(contextBreadcrumbs.textContent).toContain('<foo></foo>')
})

it('strips formatting tags from move alerts', async () => {
  await dispatch([
    importText({
      text: `
          - bbb
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const toPath = contextToPathOrThrow(store.getState(), ['bbb'], 'NavBar test')

  await dispatch([
    alert(() => createElement(MoveThoughtAlert, { from: '<font color="#ff573d"><b>aaa</b></font>', toPath })),
  ])

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

  const toPath = contextToPathOrThrow(store.getState(), ['aaa'], 'NavBar test')

  await dispatch([editThought(['aaa'], '<font color="#ff573d"><b>aaa</b></font>')])

  await dispatch([alert(() => createElement(MoveThoughtAlert, { from: 'bbb', toPath }))])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"bbb" moved to "aaa".')
  expect(alertContent.textContent).not.toContain('<font')
})

it('preserves quotes and equals signs in move alert destination label', async () => {
  await dispatch([
    importText({
      text: `
          - foo bar=""
          - baz
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const toPath = contextToPathOrThrow(store.getState(), ['foo bar=""'], 'NavBar test')

  await dispatch([alert(() => createElement(MoveThoughtAlert, { from: 'baz', toPath }))])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"baz" moved to "foo bar=""".')
})

// https://github.com/cybersemics/em/pull/4121#pullrequestreview-5057343884
it('shows home when a thought is moved to the home level', async () => {
  await dispatch([alert(() => createElement(MoveThoughtAlert, { from: 'ccc', toPath: HOME_PATH }))])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"ccc" moved to home.')
})

it('does not strip angle-bracket text from string alerts', async () => {
  await dispatch([alert('"<aaa>" deleted.')])

  const alertContent = document.querySelector('[data-testid="alert-content"]')!
  expect(alertContent.textContent).toContain('"<aaa>" deleted.')
})
