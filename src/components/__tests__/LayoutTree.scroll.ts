import { createEvent, fireEvent, render } from '@testing-library/react'
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
  return { ...actual, hasElasticOverscroll: true, isIOS: true, isTouch: true }
})

vi.mock('../../hooks/usePositionedThoughts', () => ({ default: vi.fn() }))
vi.mock('../TreeNode', () => ({ default: () => null }))

beforeEach(initStore)
afterEach(async () => {
  // Drain the cancelled frame so Motion can schedule again after Vitest resets the clock for the next test.
  await act(vi.runAllTimersAsync)
  vi.restoreAllMocks()
})

// https://github.com/cybersemics/em/pull/5400#issuecomment-5935316452
it('cancels native panning on the first move of a bounded content swipe', async () => {
  const originalScrollY = window.scrollY
  const originalHeight = window.innerHeight
  Object.assign(window, { innerHeight: 800, scrollY: 960 })
  viewportStore.update({ innerHeight: 800 })
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    Object.assign(window, { scrollY: typeof options === 'object' ? options.top : y })
  })
  vi.mocked(usePositionedThoughts).mockReturnValue({
    treeThoughtsPositioned: [
      { key: 'visible', y: 1600, x: 0, height: 1000, autofocus: 'show' } as TreeThoughtPositioned,
    ],
    indentCursorAncestorTables: 0,
    hoverArrowVisibility: null,
  })
  const content = document.createElement('div')
  content.id = 'content-wrapper'
  document.body.append(content)
  const { container, unmount } = render(createElement(Provider, { store, children: createElement(LayoutTree) }), {
    container: content,
  })
  const tree = container.firstElementChild as HTMLElement

  try {
    fireEvent.touchStart(tree, { touches: [{ clientY: 100 }] })
    vi.advanceTimersByTime(16)
    expect(fireEvent.touchMove(tree, { touches: [{ clientY: 140 }] })).toBe(false)
    expect(window.scrollY).toBe(960)
    expect(parseFloat(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset'))).toBeGreaterThan(
      10,
    )

    fireEvent.touchEnd(tree, { touches: [] })
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(window.scrollY).toBe(960)
    expect(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset')).toBe('0px')
  } finally {
    unmount()
    content.remove()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
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
  const { rerender, unmount } = render(createElement(Provider, { store, children: createElement(LayoutTree) }))

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
    expect(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset')).toBe('20px')
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
  const { rerender, unmount } = render(createElement(Provider, { store, children: createElement(LayoutTree) }))

  try {
    // Drag past the upper boundary, release, then interrupt its spring without advancing it.
    fireEvent.touchStart(window, { touches: [{ clientY: 100 }] })
    vi.advanceTimersByTime(16)
    fireEvent.touchMove(window, { touches: [{ clientY: 140 }] })
    Object.assign(window, { scrollY: 920 })
    fireEvent.scroll(window)
    fireEvent.touchEnd(window, { touches: [] })
    expect(window.scrollY).toBe(960)
    expect(parseFloat(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset'))).toBeGreaterThan(
      20,
    )

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
    expect(parseFloat(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset'))).toBeLessThan(0)
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset')).toBe('0px')
  } finally {
    unmount()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
})

// https://github.com/cybersemics/em/pull/5400#issuecomment-6132884199
it.each([
  {
    description: 'preserves release velocity when the last touchmove is delivered late',
    moves: [
      { y: 280, time: 20, delivered: 20 },
      { y: 260, time: 40, delivered: 40 },
      { y: 240, time: 60, delivered: 100 },
    ],
    releaseTime: 64,
    releaseDelivered: 104,
    minimumTravel: 75,
    maximumTravel: 110,
  },
  {
    description: 'preserves the latest velocity when the finger accelerates before release',
    moves: [
      { y: 292, time: 20, delivered: 20 },
      { y: 278, time: 40, delivered: 40 },
      { y: 258, time: 60, delivered: 60 },
    ],
    releaseTime: 64,
    releaseDelivered: 64,
    minimumTravel: 90,
    maximumTravel: 110,
  },
  {
    description: 'slows momentum when the finger decelerates before release',
    moves: [
      { y: 280, time: 20, delivered: 20 },
      { y: 266, time: 40, delivered: 40 },
      { y: 258, time: 60, delivered: 60 },
    ],
    releaseTime: 64,
    releaseDelivered: 64,
    minimumTravel: 15,
    maximumTravel: 30,
  },
  {
    description: 'preserves release velocity when touchend is delivered late',
    moves: [
      { y: 280, time: 20, delivered: 20 },
      { y: 260, time: 40, delivered: 40 },
      { y: 240, time: 60, delivered: 60 },
    ],
    releaseTime: 64,
    releaseDelivered: 160,
    minimumTravel: 75,
    maximumTravel: 110,
  },
  {
    description: 'preserves recent release velocity through a brief pause before lifting',
    moves: [
      { y: 280, time: 20, delivered: 20 },
      { y: 260, time: 40, delivered: 40 },
      { y: 240, time: 60, delivered: 60 },
    ],
    releaseTime: 124,
    releaseDelivered: 124,
    minimumTravel: 75,
    maximumTravel: 110,
  },
  {
    description: 'stops momentum when the finger pauses before release',
    moves: [
      { y: 280, time: 20, delivered: 20 },
      { y: 260, time: 40, delivered: 40 },
      { y: 240, time: 60, delivered: 60 },
    ],
    releaseTime: 180,
    releaseDelivered: 180,
    minimumTravel: -1,
    maximumTravel: 1,
  },
  {
    description: 'does not reuse stale movement after a stationary touchmove',
    moves: [
      { y: 280, time: 20, delivered: 20 },
      { y: 260, time: 40, delivered: 40 },
      { y: 240, time: 60, delivered: 60 },
      { y: 240, time: 120, delivered: 120 },
    ],
    releaseTime: 144,
    releaseDelivered: 144,
    minimumTravel: -1,
    maximumTravel: 1,
  },
  {
    description: 'follows the latest direction when a fast drag reverses before release',
    moves: [
      { y: 260, time: 20, delivered: 20 },
      { y: 220, time: 40, delivered: 40 },
      { y: 230, time: 60, delivered: 100 },
    ],
    releaseTime: 64,
    releaseDelivered: 104,
    minimumTravel: -60,
    maximumTravel: -30,
  },
])('$description', async ({ moves, releaseTime, releaseDelivered, minimumTravel, maximumTravel }) => {
  const originalScrollY = window.scrollY
  const originalHeight = window.innerHeight
  Object.assign(window, { innerHeight: 800, scrollY: 1300 })
  viewportStore.update({ innerHeight: 800 })
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    Object.assign(window, { scrollY: typeof options === 'object' ? options.top : y })
  })
  vi.mocked(usePositionedThoughts).mockReturnValue({
    treeThoughtsPositioned: [
      { key: 'visible', y: 1600, x: 0, height: 1000, autofocus: 'show' } as TreeThoughtPositioned,
    ],
    indentCursorAncestorTables: 0,
    hoverArrowVisibility: null,
  })
  const content = document.createElement('div')
  content.id = 'content-wrapper'
  document.body.append(content)
  const { container, unmount } = render(createElement(Provider, { store, children: createElement(LayoutTree) }), {
    container: content,
  })
  const tree = container.firstElementChild as HTMLElement

  try {
    const start = createEvent.touchStart(tree, { touches: [{ clientY: 300 }] })
    Object.defineProperty(start, 'timeStamp', { value: 0 })
    fireEvent(tree, start)
    moves.forEach(({ y, time, delivered }, index) => {
      vi.advanceTimersByTime(delivered - (moves[index - 1]?.delivered ?? 0))
      const move = createEvent.touchMove(tree, { touches: [{ clientY: y }] })
      Object.defineProperty(move, 'timeStamp', { value: time })
      fireEvent(tree, move)
    })
    vi.advanceTimersByTime(releaseDelivered - moves[moves.length - 1].delivered)
    const end = createEvent.touchEnd(tree, { touches: [] })
    Object.defineProperty(end, 'timeStamp', { value: releaseTime })
    fireEvent(tree, end)
    const releasedScrollY = window.scrollY

    await act(() => vi.advanceTimersByTimeAsync(100))
    const travel = window.scrollY - releasedScrollY
    expect(travel).toBeGreaterThan(minimumTravel)
    expect(travel).toBeLessThan(maximumTravel)
  } finally {
    unmount()
    content.remove()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
})

it('keeps a boundary return through a measurement update when the boundary is between pixels', async () => {
  const originalScrollY = window.scrollY
  const originalHeight = window.innerHeight
  Object.assign(window, { innerHeight: 800, scrollY: 960 })
  viewportStore.update({ innerHeight: 800 })
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    Object.assign(window, { scrollY: typeof options === 'object' ? options.top : y })
  })
  const thought = { key: 'visible', y: 1600.25, x: 0, height: 1000, autofocus: 'show' } as TreeThoughtPositioned
  vi.mocked(usePositionedThoughts).mockReturnValue({
    treeThoughtsPositioned: [thought],
    indentCursorAncestorTables: 0,
    hoverArrowVisibility: null,
  })
  const content = document.createElement('div')
  content.id = 'content-wrapper'
  document.body.append(content)
  const { container, rerender, unmount } = render(
    createElement(Provider, { store, children: createElement(LayoutTree) }),
    { container: content },
  )
  const tree = container.firstElementChild as HTMLElement

  try {
    fireEvent.touchStart(tree, { touches: [{ clientY: 100 }] })
    vi.advanceTimersByTime(16)
    fireEvent.touchMove(tree, { touches: [{ clientY: 140 }] })
    fireEvent.touchEnd(tree, { touches: [] })

    vi.mocked(usePositionedThoughts).mockReturnValue({
      treeThoughtsPositioned: [{ ...thought, height: 1001 }],
      indentCursorAncestorTables: 0,
      hoverArrowVisibility: null,
    })
    rerender(createElement(Provider, { store, children: createElement(LayoutTree) }))

    expect(parseFloat(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset'))).toBeGreaterThan(
      10,
    )
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(document.documentElement.style.getPropertyValue('--layout-tree-elastic-offset')).toBe('0px')
  } finally {
    unmount()
    content.remove()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
})

// https://github.com/cybersemics/em/pull/5400#issuecomment-6277201205
it.each([
  { delivery: 'touchmove', lastMoveY: 258.25, releasedScrollY: 1341 },
  { delivery: 'touchend', lastMoveY: 260.25, releasedScrollY: 1339 },
])('stops a settled drag despite a small release movement in $delivery', async ({ lastMoveY, releasedScrollY }) => {
  const originalScrollY = window.scrollY
  const originalHeight = window.innerHeight
  Object.assign(window, { innerHeight: 800, scrollY: 1300 })
  viewportStore.update({ innerHeight: 800 })
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    Object.assign(window, { scrollY: typeof options === 'object' ? options.top : y })
  })
  vi.mocked(usePositionedThoughts).mockReturnValue({
    treeThoughtsPositioned: [
      { key: 'visible', y: 1600, x: 0, height: 1000, autofocus: 'show' } as TreeThoughtPositioned,
    ],
    indentCursorAncestorTables: 0,
    hoverArrowVisibility: null,
  })
  const content = document.createElement('div')
  content.id = 'content-wrapper'
  document.body.append(content)
  const { container, unmount } = render(createElement(Provider, { store, children: createElement(LayoutTree) }), {
    container: content,
  })
  const tree = container.firstElementChild as HTMLElement

  try {
    const start = createEvent.touchStart(tree, { touches: [{ clientY: 300 }] })
    Object.defineProperty(start, 'timeStamp', { value: 0 })
    fireEvent(tree, start)
    const moves = [
      { y: 280, time: 20 },
      { y: 260.25, time: 40 },
      { y: 260.25, time: 60 },
      { y: 260.25, time: 80 },
      { y: 260.25, time: 100 },
      { y: lastMoveY, time: 110 },
    ]
    moves.forEach(({ y, time }, index) => {
      vi.advanceTimersByTime(time - (moves[index - 1]?.time ?? 0))
      const move = createEvent.touchMove(tree, { touches: [{ clientY: y }] })
      Object.defineProperty(move, 'timeStamp', { value: time })
      fireEvent(tree, move)
    })
    expect(window.scrollY).toBe(releasedScrollY)
    expect(document.documentElement.style.getPropertyValue('--layout-tree-scroll-remainder')).toBe('-0.75px')

    vi.advanceTimersByTime(10)
    const end = createEvent.touchEnd(tree, { touches: [], changedTouches: [{ clientY: 258.25 }] })
    Object.defineProperty(end, 'timeStamp', { value: 120 })
    fireEvent(tree, end)
    await act(() => vi.advanceTimersByTimeAsync(2000))

    expect(window.scrollY).toBe(releasedScrollY)
    expect(document.documentElement.style.getPropertyValue('--layout-tree-scroll-remainder')).toBe('-0.75px')
  } finally {
    unmount()
    content.remove()
    Object.assign(window, { innerHeight: originalHeight, scrollY: originalScrollY })
  }
})
