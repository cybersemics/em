import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { Provider } from 'react-redux'
import Command from '../../../@types/Command'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../../actions/commandUniverseNavigate'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../../actions/toggleMobileCommandUniverse'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import CommandUniversePageTransitions from '../CommandUniversePageTransitions'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('shows a detail visit with no transition settled and focused without waiting for a zoom', async () => {
  await initStore()
  const command: Command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false }
  store.dispatch(toggleMobileCommandUniverse({ value: true }))
  store.dispatch(commandUniverseNavigate('detail', { command }, { transition: 'none' }))
  const entries = store.getState().commandUniverseNavigation.entries

  render(
    createElement(Provider, {
      store,
      children: createElement(CommandUniversePageTransitions, {
        children: entries.map(entry =>
          createElement(
            'div',
            { key: entry.entryId },
            createElement(
              'h2',
              { 'data-page-focus': true, tabIndex: -1 },
              entry.page.pageId === 'detail' ? 'New Thought' : 'Grid',
            ),
          ),
        ),
      }),
    }),
  )

  const heading = screen.getByRole('heading', { name: 'New Thought' })
  const page = heading.closest<HTMLElement>('[data-entry-id]')!
  expect(page).toHaveStyle({ opacity: '1', filter: 'blur(0px)' })
  expect(heading).toHaveFocus()
  expect(store.getState().commandUniverseNavigation.transition).toBeNull()
})
