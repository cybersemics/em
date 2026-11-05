import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { toggleSidebarActionCreator as toggleSidebar } from '../../actions/toggleSidebar'
import { unfoldContextActionCreator as unfoldContext } from '../../actions/unfoldContext'
import ContextBreadcrumbs from '../../components/ContextBreadcrumbs'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import appendToPath from '../../util/appendToPath'
import head from '../../util/head'

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
    toggleSidebar({ value: true }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const contextBreadcrumbs = Array.from(
    document.querySelectorAll('[data-testid="favorites"] [aria-label="context-breadcrumbs"] [role="button"]'),
  ).map(breadcrumb => breadcrumb.innerHTML)

  expect(contextBreadcrumbs).toEqual(['A', 'B'])
})

it('hides an unfolded occurrence anchor while preserving the portal divider and original breadcrumb link routes', async () => {
  await dispatch([
    importText({
      text: `
- Reading
  - m
- Outside
  - District
    - Park
      - m
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const state = store.getState()
  const contextViewPath = contextToPathOrThrow(state, ['Reading', 'm'], 'breadcrumb test')
  const district = contextToPathOrThrow(state, ['Outside', 'District'], 'breadcrumb test')
  const nominal = contextToPathOrThrow(state, ['Outside', 'District', 'Park', 'm'], 'breadcrumb test')
  await dispatch(unfoldContext({ contextViewPath, contextId: head(nominal), ancestorId: head(district) }))
  const route = appendToPath(store.getState().cursor!, ...nominal.slice(district.length))
  await dispatch(setCursorPath({ path: route }))
  await act(vi.runOnlyPendingTimersAsync)

  /** Gets the real cursor footer rather than the independent in-tree ancestor buttons. */
  const breadcrumbs = () =>
    Array.from(document.querySelectorAll('[aria-label="context-breadcrumbs"]')).find(element =>
      element.textContent?.includes('Reading'),
    )!
  /** Gets the current footer links after each navigation rerender. */
  const links = () => Array.from(breadcrumbs().querySelectorAll('[data-thought-link]'))
  expect(links().map(link => link.textContent)).toEqual(['Reading', 'm', 'District', 'Park', 'm'])
  expect(breadcrumbs().textContent?.replace(/\s+/g, ' ').trim()).toBe('Reading • m ⇢ District • Park • m')

  const user = userEvent.setup({ delay: null })
  await user.click(links()[2])
  expect(store.getState().cursor).toEqual(district)
  await dispatch(setCursorPath({ path: route }))
  await act(vi.runOnlyPendingTimersAsync)
  await user.click(links().at(-1)!)
  expect(store.getState().cursor).toEqual(nominal)
})

it.each([undefined, 2])('preserves archive-filtered links with thoughtsLimit %s', async thoughtsLimit => {
  await dispatch(
    importText({
      text: `
- Folder
  - =archive
    - Parent
      - Last
`,
    }),
  )
  const path = contextToPathOrThrow(store.getState(), ['Folder', '=archive', 'Parent', 'Last'], 'breadcrumb test')
  const rendered = render(
    createElement(Provider, {
      store,
      children: createElement(ContextBreadcrumbs, { path, hideArchive: true, thoughtsLimit }),
    }),
  )
  const links = Array.from(rendered.container.querySelectorAll('[data-thought-link]'))
  expect(links.map(link => link.textContent)).toEqual(thoughtsLimit ? ['Last'] : ['Folder', 'Parent', 'Last'])
  const user = userEvent.setup({ delay: null })
  await user.click(links.at(-1)!)
  expect(store.getState().cursor).toEqual(path)
})
