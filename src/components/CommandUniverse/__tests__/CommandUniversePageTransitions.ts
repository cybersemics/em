import { cleanup, render, screen } from '@testing-library/react'
import { MotionConfig } from 'motion/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import Command from '../../../@types/Command'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../../actions/commandUniverseNavigate'
import { toggleCommandUniverseActionCreator as toggleCommandUniverse } from '../../../actions/toggleCommandUniverse'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import CommandUniversePageTransitions from '../CommandUniversePageTransitions'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it.each(['none', 'zoom'] as const)(
  'settles and focuses a detail visit immediately for %s with zero duration',
  async transition => {
    await initStore()
    const command: Command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false }
    store.dispatch(toggleCommandUniverse({ value: true }))

    /** Renders the history surfaces supplied by the router. */
    const pages = () =>
      createElement(MotionConfig, {
        transition: { duration: 0 },
        children: createElement(Provider, {
          store,
          children: createElement(CommandUniversePageTransitions, {
            children: store
              .getState()
              .commandUniverseNavigation.entries.map(entry =>
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
      })

    const view = render(pages())
    act(() => {
      store.dispatch(commandUniverseNavigate('detail', { command }, { transition }))
      view.rerender(pages())
    })

    const heading = screen.getByRole('heading', { name: 'New Thought' })
    const page = heading.closest<HTMLElement>('[data-entry-id]')!
    expect(page).toHaveStyle({ opacity: '1', filter: 'blur(0px)' })
    expect(heading).toHaveFocus()
    expect(page).not.toHaveAttribute('inert')
  },
)
