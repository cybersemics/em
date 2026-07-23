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
const layout = (regularCount: number, persistentCount = 0) =>
  renderHook(() => useGestureMenuLayout(regularCount, persistentCount), { wrapper }).result.current

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

  it('caps rowsPerColumn and trims regular commands on a short viewport', () => {
    // 854×340 → 2 columns, maxRowsBottom 3. 12 total items (10 main + 2 persistent) need 6
    // balanced rows > maxRowsInline 5, so it falls back to the bottom row and trims main to the grid.
    setViewport(854, 340)
    const { columnCount, rowsPerColumn, visibleRegularCount } = layout(10, 2)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(3)
    // Main commands fill the reserved-height grid: 2 × 3 = 6 visible.
    expect(visibleRegularCount).toBe(6)
    expect(visibleRegularCount).toBeLessThan(10)
  })

  it('never trims below zero', () => {
    setViewport(390, 300)
    expect(layout(30).visibleRegularCount).toBeGreaterThanOrEqual(0)
  })

  it('flows persistent commands inline and balances them across the columns', () => {
    // Tall viewport, 5 main + 2 persistent = 7 items over 2 columns → 4 balanced rows.
    setViewport(854, TALL)
    const { persistentInline, rowsPerColumn, visibleRegularCount, persistentColumnIndex } = layout(5, 2)
    expect(persistentInline).toBe(true)
    expect(rowsPerColumn).toBe(4)
    expect(visibleRegularCount).toBe(5)
    // Main fills both columns (4 + 1), so persistent attaches to the last column.
    expect(persistentColumnIndex).toBe(1)
  })

  it('attaches persistent to the first column when a single main command leaves later columns empty', () => {
    // Tall viewport, 1 main + 2 persistent over 2 columns: main reaches only the first column,
    // so the persistent block joins it rather than sitting alone in the empty second column.
    setViewport(854, TALL)
    const { persistentInline, persistentColumnIndex } = layout(1, 2)
    expect(persistentInline).toBe(true)
    expect(persistentColumnIndex).toBe(0)
  })

  it('attaches persistent to the first column when there are no main commands', () => {
    // Tall viewport, 0 main + 2 persistent over 2 columns: persistent sits at the top of column 0.
    setViewport(854, TALL)
    const { persistentInline, persistentColumnIndex } = layout(0, 2)
    expect(persistentInline).toBe(true)
    expect(persistentColumnIndex).toBe(0)
  })

  it('keeps all commands inline when they fit the inline height budget', () => {
    // H=420 → maxRowsInline 7. 8 main + 2 persistent = 10 items over 2 columns → 5 balanced rows ≤ 7.
    setViewport(854, 420)
    const { persistentInline, rowsPerColumn, visibleRegularCount } = layout(8, 2)
    expect(persistentInline).toBe(true)
    expect(rowsPerColumn).toBe(5)
    // Main commands are NOT trimmed — they balance with the persistent commands.
    expect(visibleRegularCount).toBe(8)
  })

  it('falls back to the bottom row when the balanced grid overflows the inline height', () => {
    // H=420 → maxRowsInline 7. 13 main + 2 persistent = 15 items over 2 columns → 8 balanced rows > 7.
    setViewport(854, 420)
    const { persistentInline, visibleRegularCount } = layout(13, 2)
    expect(persistentInline).toBe(false)
    // Bottom-row path trims main to the reserved-height grid capacity (2 × maxRowsBottom 5 = 10).
    expect(visibleRegularCount).toBe(10)
  })

  it('never flows persistent inline in single column', () => {
    setViewport(390, TALL)
    expect(layout(4, 2).persistentInline).toBe(false)
  })

  it('handles zero regular commands', () => {
    setViewport(1177, TALL)
    const { rowsPerColumn, visibleRegularCount } = layout(0)
    expect(rowsPerColumn).toBe(0)
    expect(visibleRegularCount).toBe(0)
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
