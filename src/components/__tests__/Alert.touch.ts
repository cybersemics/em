import { fireEvent, render, screen } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { alertActionCreator as alert } from '../../actions/alert'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import Alert from '../Alert'

// The whole app cannot be mounted with isTouch true, since TraceGesture renders a signature pad onto a canvas
// that jsdom does not implement, so Alert is rendered on its own.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/3789
it('auto-dismisses on touch after a tap synthesizes mouseover', async () => {
  await dispatch(alert('Permanently deleted a', { clearDelay: 1000 }))
  render(createElement(Provider, { store, children: createElement(Alert) }))

  // A touch browser synthesizes mouseover from a tap, but no mouseout until the user taps elsewhere.
  fireEvent.mouseOver(screen.getByTestId('alert-content'))
  await act(vi.runAllTimersAsync)

  expect(screen.queryByTestId('alert-content')).toBeNull()
})

it('pauses the auto-dismiss timer while the alert is being touched', async () => {
  await dispatch(alert('Permanently deleted a', { clearDelay: 1000 }))
  render(createElement(Provider, { store, children: createElement(Alert) }))

  await act(async () => {
    fireEvent.touchStart(screen.getByTestId('alert-content'), { touches: [{ pageY: 0 }] })
  })
  await act(() => vi.advanceTimersByTimeAsync(2000))
  expect(screen.queryByTestId('alert-content')).not.toBeNull()

  await act(async () => {
    fireEvent.touchEnd(screen.getByTestId('alert-content'), { touches: [{ pageY: 0 }] })
  })
  await act(vi.runAllTimersAsync)
  expect(screen.queryByTestId('alert-content')).toBeNull()
})
