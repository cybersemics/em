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

// A viewport tall enough that maxRows never caps rowsPerColumn (a column can hold ~126 rows).
const TALL = 5000

// A short viewport where, above the md breakpoint, maxRowsInline = 5 and maxRowsBottom = 3. Used to
// force the packed layout into multiple columns with realistic command counts (TALL would need ~130
// commands to overflow a single column).
const SHORT = 340

describe('useGestureMenuLayout', () => {
  beforeEach(() => {
    store.dispatch({ type: 'clear', full: true })
    // Default root font size: 1rem = 18px. Min column 280px, gap 35px → stride 315px.
    act(() => {
      store.dispatch(fontSizeActionCreator(18))
    })
  })

  // --- Width cap: columns never exceed what fits the viewport ---------------------------------
  // Each case supplies enough commands to overflow a single column (maxRowsInline = 5 at SHORT), so
  // the packed column count is bounded by the width cap rather than by the command count.

  it('caps at one column just below the two-column width threshold', () => {
    // 760px panel − 2·90px padding = 580px inner width (< 595px 2-column threshold).
    setViewport(760, SHORT)
    expect(layout(10).columnCount).toBe(1)
  })

  it('allows two columns just above the width threshold', () => {
    // 820px panel − 180px padding = 640px inner width.
    setViewport(820, SHORT)
    expect(layout(10).columnCount).toBe(2)
  })

  it('caps at two columns at desktop-854 geometry', () => {
    // 854px panel − 180px padding = 674px inner width (matches mockup 6586:107957).
    setViewport(854, SHORT)
    expect(layout(10).columnCount).toBe(2)
  })

  it('caps at three columns at iPad-1177 geometry', () => {
    // 1177px frame − 180px padding = 997px inner width (matches mockup 6585:107093). 15 commands
    // over a 5-row capacity need 3 columns, which the width also allows.
    setViewport(1177, SHORT)
    expect(layout(15).columnCount).toBe(3)
  })

  it('falls back to one column on a narrow landscape viewport', () => {
    // 700px − 180px = 520px inner width, fits fewer than two minimum-width columns.
    setViewport(700, SHORT)
    expect(layout(10).columnCount).toBe(1)
  })

  it('forces one column below the md breakpoint', () => {
    setViewport(390, TALL)
    const { columnCount, isMobilePortrait } = layout(12)
    expect(columnCount).toBe(1)
    expect(isMobilePortrait).toBe(true)
  })

  // --- Packed layout: use as many columns as needed, not as many as fit --------------------------

  it('stays single-column when every command fits one column (tall viewport)', () => {
    // 854 fits two columns by width, but 8 commands fit one column's height, so it stays single.
    setViewport(854, TALL)
    const { columnCount, isMultiColumn } = layout(8)
    expect(columnCount).toBe(1)
    expect(isMultiColumn).toBe(false)
  })

  it('opens a second column only once the first is full', () => {
    // SHORT → maxRowsInline 5. 6 commands overflow the first column's capacity by one.
    setViewport(854, SHORT)
    const { columnCount, rowsPerColumn } = layout(6)
    expect(columnCount).toBe(2)
    // Fixed capacity, not a balanced average (which would be ceil(6/2) = 3): column 0 fills to 5,
    // column 1 holds the remaining 1.
    expect(rowsPerColumn).toBe(5)
  })

  it('drains the last column as the list narrows instead of rebalancing', () => {
    // The first column stays pinned at capacity (5) while the last column shrinks 2 → 1.
    setViewport(854, SHORT)
    expect(layout(7).rowsPerColumn).toBe(5)
    expect(layout(6).rowsPerColumn).toBe(5)
  })

  // --- Persistent commands (Cancel / Gesture Cheatsheet) -----------------------------------------

  it('flows persistent commands inline at the bottom of the last main column', () => {
    // SHORT → maxRowsInline 5. 6 main fill columns 5 + 1; persistent (2) stack under the last (1 + 2 = 3 ≤ 5).
    setViewport(854, SHORT)
    const { persistentInline, rowsPerColumn, visibleRegularCount, persistentColumnIndex } = layout(6, 2)
    expect(persistentInline).toBe(true)
    expect(rowsPerColumn).toBe(5)
    expect(visibleRegularCount).toBe(6)
    expect(persistentColumnIndex).toBe(1)
  })

  it('collapses persistent to the single-column path when everything fits one column', () => {
    // Tall viewport: 8 main + 2 persistent fit one column, so the single-column (mobile) path renders
    // persistent rather than the inline multi-column block.
    setViewport(854, TALL)
    const { columnCount, isMultiColumn, persistentInline } = layout(8, 2)
    expect(columnCount).toBe(1)
    expect(isMultiColumn).toBe(false)
    expect(persistentInline).toBe(false)
  })

  it('falls back to the bottom row when persistent does not fit under the last column', () => {
    // SHORT → maxRowsInline 5, maxRowsBottom 3. 9 main pack 5 + 4; 4 + 2 persistent = 6 > 5, so
    // persistent drops to the full-width bottom row and main trims to the reserved grid (2 × 3 = 6).
    setViewport(854, SHORT)
    const { persistentInline, visibleRegularCount } = layout(9, 2)
    expect(persistentInline).toBe(false)
    expect(visibleRegularCount).toBe(6)
  })

  it('never flows persistent inline in single column', () => {
    setViewport(390, TALL)
    expect(layout(4, 2).persistentInline).toBe(false)
  })

  // --- Trimming and edges ------------------------------------------------------------------------

  it('caps rowsPerColumn and trims regular commands on a short viewport', () => {
    // 854×340 → 2 columns, maxRowsBottom 3. 10 main + 2 persistent → persistent can't fit inline, so
    // it falls to the bottom row and main trims to the reserved-height grid (2 × 3 = 6).
    setViewport(854, SHORT)
    const { columnCount, rowsPerColumn, visibleRegularCount } = layout(10, 2)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(3)
    expect(visibleRegularCount).toBe(6)
    expect(visibleRegularCount).toBeLessThan(10)
  })

  it('never trims below zero', () => {
    setViewport(390, 300)
    expect(layout(30).visibleRegularCount).toBeGreaterThanOrEqual(0)
  })

  it('handles zero regular commands', () => {
    setViewport(1177, TALL)
    const { columnCount, visibleRegularCount } = layout(0)
    expect(columnCount).toBe(1)
    expect(visibleRegularCount).toBe(0)
  })

  it('scales the column count with the runtime font size', () => {
    // At the default font size, 10 commands on a short 2-column viewport use both columns. At 2×
    // font the 280px minimum column doubles, dropping desktop-854 to a single column.
    setViewport(854, SHORT)
    expect(layout(10).columnCount).toBe(2)
    act(() => {
      store.dispatch(fontSizeActionCreator(36))
    })
    expect(layout(10).columnCount).toBe(1)
  })
})
