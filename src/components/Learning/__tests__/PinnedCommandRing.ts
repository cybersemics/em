import { cleanup, render, screen } from '@testing-library/react'
import { act, createElement } from 'react'
import PinnedCommandRing from '../PinnedCommandRing'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('animates the fill angle when progress increases after a rep', async () => {
  vi.useFakeTimers({
    toFake: ['Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
  })

  const { rerender } = render(createElement(PinnedCommandRing, { progress: 0.2 }))
  /** Returns the fill progress currently drawn, from 0 to 1. */
  const drawnProgress = () => Number(screen.getByTestId('pinned-command-ring-fill').dataset.progress)

  expect(drawnProgress()).toBe(0.2)

  // A rep raises the target, but the fill starts from where it is drawn.
  rerender(createElement(PinnedCommandRing, { progress: 0.4 }))
  expect(drawnProgress()).toBe(0.2)

  // Partway through the tween, the fill is between the old and new progress.
  await act(async () => vi.advanceTimersByTimeAsync(200))
  expect(drawnProgress()).toBeGreaterThan(0.2)
  expect(drawnProgress()).toBeLessThan(0.4)
})
