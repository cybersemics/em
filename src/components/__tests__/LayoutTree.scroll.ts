import { fireEvent, render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import TreeThoughtPositioned from '../../@types/TreeThoughtPositioned'
import usePositionedThoughts from '../../hooks/usePositionedThoughts'
import store from '../../stores/app'
import viewportStore from '../../stores/viewportStore'
import initStore from '../../test-helpers/initStore'
import LayoutTree from '../LayoutTree'

// Motion captures requestAnimationFrame at import time. Route frames through the test clock installed by initStore.
vi.hoisted(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
})

vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isIOS: true, isTouch: true }
})

vi.mock('../../hooks/usePositionedThoughts', () => ({ default: vi.fn() }))
vi.mock('../TreeNode', () => ({ default: () => null }))

beforeEach(initStore)
afterEach(async () => {
  // Drain the cancelled frame so Motion can schedule again after Vitest resets the clock for the next test.
  await act(vi.runAllTimersAsync)
  vi.restoreAllMocks()
})

it('keeps native momentum through a measurement update before reaching the opposite boundary', () => {
  const originalScrollY = window.scrollY
  const originalHeight = window.innerHeight
  Object.assign(window, { innerHeight: 800, scrollY: 1100 })
  viewportStore.update({ innerHeight: 800 })
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    Object.assign(window, { scrollY: typeof options === 'object' ? options.top : y })
  })

  const thought = { key: 'visible', y: 1600, x: 0, height: 1000, autofocus: 'show' } as TreeThoughtPositioned
  vi.mocked(usePositionedThoughts).mockReturnValue({
    treeThoughtsPositioned: [thought],
    indentCursorAncestorTables: 0,
    hoverArrowVisibility: null,
  })
  const { container, rerender, unmount } = render(
    createElement(Provider, { store, children: createElement(LayoutTree) }),
  )

  try {
    fireEvent.touchStart(window, { touches: [{ clientY: 100 }] })
    vi.advanceTimersByTime(16)
    fireEvent.touchMove(window, { touches: [{ clientY: 140 }] })
    Object.assign(window, { scrollY: 1060 })
    fireEvent.scroll(window)
    fireEvent.touchEnd(window, { touches: [] })

    vi.mocked(usePositionedThoughts).mockReturnValue({
      treeThoughtsPositioned: [{ ...thought, height: 1010 }],
      indentCursorAncestorTables: 0,
      hoverArrowVisibility: null,
    })
    rerender(createElement(Provider, { store, children: createElement(LayoutTree) }))
    vi.advanceTimersByTime(16)
    Object.assign(window, { scrollY: 940 })
    fireEvent.scroll(window)

    // The unchanged upper boundary is 1600 - 0.8 * 800 = 960. The incoming 20px overshoot must enter a spring.
    expect(window.scrollY).toBe(960)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--layout-tree-elastic-offset')).toBe(
      '20px',
    )
  } finally {
    unmount()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
})

it('keeps synthesized momentum through a measurement update after reversing an interrupted stretch', async () => {
  const originalScrollY = window.scrollY
  const originalHeight = window.innerHeight
  Object.assign(window, { innerHeight: 800, scrollY: 960 })
  viewportStore.update({ innerHeight: 800 })
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    Object.assign(window, { scrollY: typeof options === 'object' ? options.top : y })
  })

  const thought = { key: 'visible', y: 1600, x: 0, height: 1000, autofocus: 'show' } as TreeThoughtPositioned
  vi.mocked(usePositionedThoughts).mockReturnValue({
    treeThoughtsPositioned: [thought],
    indentCursorAncestorTables: 0,
    hoverArrowVisibility: null,
  })
  const { container, rerender, unmount } = render(
    createElement(Provider, { store, children: createElement(LayoutTree) }),
  )

  try {
    // Drag past the upper boundary, release, then interrupt its spring without advancing it.
    fireEvent.touchStart(window, { touches: [{ clientY: 100 }] })
    vi.advanceTimersByTime(16)
    fireEvent.touchMove(window, { touches: [{ clientY: 140 }] })
    Object.assign(window, { scrollY: 920 })
    fireEvent.scroll(window)
    fireEvent.touchEnd(window, { touches: [] })
    expect(window.scrollY).toBe(960)
    expect(
      parseFloat((container.firstElementChild as HTMLElement).style.getPropertyValue('--layout-tree-elastic-offset')),
    ).toBeGreaterThan(20)

    fireEvent.touchStart(window, { touches: [{ clientY: 140 }] })
    vi.advanceTimersByTime(16)
    fireEvent.touchMove(window, { touches: [{ clientY: 40 }] })
    Object.assign(window, { scrollY: 1060 })
    fireEvent.scroll(window)
    fireEvent.touchEnd(window, { touches: [] })
    const releasedScrollY = window.scrollY
    expect(releasedScrollY).toBe(1020)

    vi.mocked(usePositionedThoughts).mockReturnValue({
      treeThoughtsPositioned: [{ ...thought, height: 1010 }],
      indentCursorAncestorTables: 0,
      hoverArrowVisibility: null,
    })
    rerender(createElement(Provider, { store, children: createElement(LayoutTree) }))
    await act(() => vi.advanceTimersByTimeAsync(100))

    expect(window.scrollY).toBeGreaterThan(releasedScrollY + 100)

    // A nearer, newly measured lower boundary must receive the coast without discarding its spring.
    vi.mocked(usePositionedThoughts).mockReturnValue({
      treeThoughtsPositioned: [{ ...thought, height: 200 }],
      indentCursorAncestorTables: 0,
      hoverArrowVisibility: null,
    })
    rerender(createElement(Provider, { store, children: createElement(LayoutTree) }))
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(window.scrollY).toBe(1640)
    expect(
      parseFloat((container.firstElementChild as HTMLElement).style.getPropertyValue('--layout-tree-elastic-offset')),
    ).toBeLessThan(0)
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--layout-tree-elastic-offset')).toBe(
      '0px',
    )
  } finally {
    unmount()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
})
