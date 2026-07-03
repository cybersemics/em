import { renderHook } from '@testing-library/react'
import React, { act } from 'react'
import { Provider } from 'react-redux'
import { fontSizeActionCreator } from '../../actions/fontSize'
import store from '../../stores/app'
import viewportStore from '../../stores/viewport'
import useGestureMenuLayout from '../useGestureMenuLayout'

/** Redux Provider wrapper so the hook can read state.fontSize. */
const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store, children })

/** Sets the viewport dimensions the hook reads. */
const setViewport = (innerWidth: number, innerHeight: number) => {
  act(() => {
    viewportStore.update({ innerWidth, innerHeight })
  })
}

/** Renders the hook with the current store/viewport and returns the layout result. */
const layout = (regularCount: number) =>
  renderHook(() => useGestureMenuLayout(regularCount), { wrapper }).result.current

// A viewport tall enough that maxRows never caps rowsPerColumn.
const TALL = 5000

describe('useGestureMenuLayout', () => {
  beforeEach(() => {
    store.dispatch({ type: 'clear', full: true })
    // Default root font size: 1rem = 18px. Min column 280px, gap 35px → stride 315px.
    act(() => {
      store.dispatch(fontSizeActionCreator(18))
    })
  })

  it('renders one column just below the two-column threshold', () => {
    // 760px panel − 2·90px padding = 580px inner width (< 595px 2-column threshold).
    setViewport(760, TALL)
    expect(layout(5).columnCount).toBe(1)
  })

  it('renders two columns just above the threshold', () => {
    // 820px panel − 180px padding = 640px inner width.
    setViewport(820, TALL)
    expect(layout(5).columnCount).toBe(2)
  })

  it('renders two columns at desktop-854 geometry', () => {
    // 854px panel − 180px padding = 674px inner width (matches mockup 6586:107957).
    setViewport(854, TALL)
    expect(layout(8).columnCount).toBe(2)
  })

  it('renders three columns at iPad-1177 geometry', () => {
    // 1177px frame − 180px padding = 997px inner width (matches mockup 6585:107093).
    setViewport(1177, TALL)
    expect(layout(11).columnCount).toBe(3)
  })

  it('falls back to one column on a narrow landscape viewport', () => {
    // 700px − 180px = 520px inner width, fits fewer than two minimum-width columns.
    setViewport(700, TALL)
    expect(layout(6).columnCount).toBe(1)
  })

  it('forces one column below the md breakpoint', () => {
    setViewport(390, TALL)
    const { columnCount, isMobilePortrait } = layout(12)
    expect(columnCount).toBe(1)
    expect(isMobilePortrait).toBe(true)
  })

  it('reports lastColumnEmpty when regular commands do not reach the last column', () => {
    // 3 columns, 4 commands → 2 rows/col, filling col1 and col2, leaving col3 empty.
    setViewport(1177, TALL)
    const { columnCount, rowsPerColumn, lastColumnEmpty } = layout(4)
    expect(columnCount).toBe(3)
    expect(rowsPerColumn).toBe(2)
    expect(lastColumnEmpty).toBe(true)
  })

  it('reports lastColumnEmpty false when a command spills into the last column', () => {
    // 3 columns, 5 commands → 2 rows/col, col3 gets 1 command.
    setViewport(1177, TALL)
    expect(layout(5).lastColumnEmpty).toBe(false)
  })

  it('caps rowsPerColumn and trims regular commands on a short viewport', () => {
    // Height chosen so maxRows caps to 2 rows per column.
    setViewport(854, 340)
    const { columnCount, rowsPerColumn, visibleRegularCount } = layout(10)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(2)
    // Grid capacity 4 cells minus 2 reserved for the persistent block → 2 visible.
    expect(visibleRegularCount).toBe(2)
    expect(visibleRegularCount).toBeLessThan(10)
  })

  it('never trims below zero and keeps room for the persistent block', () => {
    setViewport(390, 300)
    expect(layout(30).visibleRegularCount).toBeGreaterThanOrEqual(0)
  })

  it('handles zero regular commands', () => {
    setViewport(1177, TALL)
    const { rowsPerColumn, visibleRegularCount, lastColumnEmpty } = layout(0)
    expect(rowsPerColumn).toBe(0)
    expect(visibleRegularCount).toBe(0)
    expect(lastColumnEmpty).toBe(true)
  })

  it('scales the column count with the runtime font size', () => {
    // At 2× font size, the 280px minimum column doubles, so desktop-854 drops to 1 column.
    setViewport(854, TALL)
    act(() => {
      store.dispatch(fontSizeActionCreator(36))
    })
    expect(layout(8).columnCount).toBe(1)
  })
})
