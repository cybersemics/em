import { cleanup, render } from '@testing-library/react'
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

  const { container, rerender } = render(createElement(PinnedCommandRing, { progress: 0.2 }))
  /** Returns the rendered conic gradient that paints the progress arc. */
  const fill = () =>
    Array.from(container.querySelectorAll('div')).find(element => element.style.background.includes('conic-gradient'))!

  expect(fill().style.background).toContain('transparent 72.00deg')

  rerender(createElement(PinnedCommandRing, { progress: 0.4 }))
  expect(fill().style.background).toContain('transparent 72.00deg')

  await act(async () => vi.advanceTimersByTimeAsync(200))
  expect(fill().style.background).not.toContain('transparent 72.00deg')
  expect(fill().style.background).not.toContain('transparent 144.00deg')
})
