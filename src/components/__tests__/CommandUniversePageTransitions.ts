import { act, cleanup, render, screen } from '@testing-library/react'
import { MotionConfig } from 'motion/react'
import { createElement } from 'react'
import Command from '../../@types/Command'
import CommandUniversePageNavigator from '../../@types/CommandUniversePageNavigator'
import CommandUniverseContext from '../CommandUniverse/CommandUniverseContext'
import CommandUniversePageTransitions from '../CommandUniverse/CommandUniversePageTransitions'

const command: Command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false }
const entries: CommandUniversePageNavigator['entries'] = [
  { entryId: 'grid', page: { pageId: 'grid', props: {} } },
  { entryId: 'detail', page: { pageId: 'detail', props: { command } } },
]
const transition: CommandUniversePageNavigator['transition'] = {
  id: 'visit',
  fromEntryId: 'grid',
  toEntryId: 'detail',
  zoom: 'in',
  origin: null,
}

/** Supplies controller state to the real Motion-powered view without mocking its animation implementation. */
const renderPages = (
  state: Pick<CommandUniversePageNavigator, 'transition' | 'isOpen' | 'finishTransition'>,
  duration = 0,
) =>
  createElement(CommandUniverseContext.Provider, {
    value: {
      entries,
      activeEntryId: 'detail',
      canGoBack: false,
      canGoForward: false,
      back: () => {},
      forward: () => {},
      open: () => {},
      ...state,
    },
    children: createElement(MotionConfig, {
      transition: { duration },
      children: createElement(CommandUniversePageTransitions, {
        children: [
          createElement('h3', { key: 'grid', tabIndex: -1, 'data-page-focus': true }, 'Commands'),
          createElement('h3', { key: 'detail', tabIndex: -1, 'data-page-focus': true }, 'New Thought'),
        ],
      }),
    }),
  })

beforeEach(() => vi.useFakeTimers())
afterEach(async () => {
  cleanup()
  await act(vi.runAllTimersAsync)
  vi.useRealTimers()
})

it('reports completion from Motion when both page animations finish', async () => {
  const finishTransition = vi.fn()
  render(renderPages({ transition, isOpen: true, finishTransition }))
  await act(vi.runAllTimersAsync)
  expect(finishTransition).toHaveBeenCalledExactlyOnceWith('visit')
})

it('focuses the destination after completion and keeps inactive pages inert', async () => {
  const finishTransition = vi.fn()
  const view = render(renderPages({ transition, isOpen: true, finishTransition }))
  expect(screen.getByTestId('active-page')).toHaveAttribute('inert')
  await act(vi.runAllTimersAsync)
  view.rerender(renderPages({ transition: null, isOpen: true, finishTransition }))
  expect(screen.getByRole('heading', { name: 'New Thought' })).toHaveFocus()
  expect(screen.getByTestId('inactive-page')).toHaveAttribute('inert')
  expect(screen.getByText('Commands')).not.toBeVisible()
})

it('stops pending motion without reporting a stale completion or stealing focus on close', async () => {
  const finishTransition = vi.fn()
  const view = render(renderPages({ transition, isOpen: true, finishTransition }, 1.25))
  view.rerender(renderPages({ transition: null, isOpen: false, finishTransition }, 1.25))
  await act(vi.runAllTimersAsync)
  expect(finishTransition).not.toHaveBeenCalled()
  expect(screen.getByText('New Thought')).not.toHaveFocus()
})
