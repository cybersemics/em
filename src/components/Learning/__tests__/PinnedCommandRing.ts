import { cleanup, render, screen } from '@testing-library/react'
import { motionValue } from 'motion/react'
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

/** Returns the conic gradients that paint the colorful arc, which exist only while the flourish plays. */
const colorfulFills = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('div')).filter(element =>
    element.style.background.includes('rgba(35, 20, 73, 0.87)'),
  )

it('mounts the colorful fill as soon as a flourish is requested on a full ring', () => {
  const { container, rerender } = render(createElement(PinnedCommandRing, { progress: 1, flourish: 0 }))
  expect(colorfulFills(container)).toHaveLength(0)

  // A rep after completion: the fill is already full, so the flourish starts at once.
  rerender(createElement(PinnedCommandRing, { progress: 1, flourish: 1 }))
  expect(colorfulFills(container).length).toBeGreaterThan(0)
})

it('starts the flourish at once on the completing rep, closing the fill within it', () => {
  const { container, rerender } = render(createElement(PinnedCommandRing, { progress: 0.8, flourish: 0 }))

  // The completing rep: the flourish owns the last segment of the fill rather than waiting for it.
  rerender(createElement(PinnedCommandRing, { progress: 1, flourish: 1 }))
  expect(colorfulFills(container).length).toBeGreaterThan(0)
})

it('does not play the flourish on mount', () => {
  const { container } = render(createElement(PinnedCommandRing, { progress: 1, flourish: 3 }))
  expect(colorfulFills(container)).toHaveLength(0)
})

it('fades the colorful fill with the supplied color opacity', async () => {
  vi.useFakeTimers({
    toFake: ['Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
  })
  const activeOpacity = motionValue(0)
  const { container } = render(createElement(PinnedCommandRing, { progress: 0.4, activeOpacity }))
  expect(colorfulFills(container)).toHaveLength(0)

  act(() => activeOpacity.set(0.5))
  expect(colorfulFills(container).length).toBeGreaterThan(0)
  await act(async () => vi.advanceTimersByTimeAsync(20))
  expect(colorfulFills(container)[0].parentElement?.parentElement?.style.opacity).toBe('0.5')

  act(() => activeOpacity.set(0))
  expect(colorfulFills(container)).toHaveLength(0)
})

it('keeps the colorful fill mounted when supplied color opacity falls during a flourish', () => {
  const activeOpacity = motionValue(0)
  const { container, rerender } = render(createElement(PinnedCommandRing, { progress: 1, flourish: 0, activeOpacity }))

  rerender(createElement(PinnedCommandRing, { progress: 1, flourish: 1, activeOpacity }))
  act(() => activeOpacity.set(0.5))
  act(() => activeOpacity.set(0))

  expect(colorfulFills(container).length).toBeGreaterThan(0)
})
