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

// Viewport heights chosen (at the 18px default root) to yield known per-column capacities above the
// two-column width breakpoint:
//   TALL  → maxRowsInline 121 (a column never fills, so packing collapses to a single column)
//   MID   → maxRowsInline 8
//   SHORT → maxRowsInline 3
const TALL = 5000
const MID = 490
const SHORT = 290

describe('useGestureMenuLayout', () => {
  beforeEach(() => {
    store.dispatch({ type: 'clear', full: true })
    // Default root font size: 1rem = 18px. Min column 280px, gap 35px → stride 315px.
    act(() => {
      store.dispatch(fontSizeActionCreator(18))
    })
  })

  // --- Width cap: columns never exceed what fits the viewport ---------------------------------
  // Each case supplies enough commands to overflow the columns, so the packed column count is bounded
  // by the width cap rather than by the command count.

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
    // 1177px frame − 180px padding = 997px inner width (matches mockup 6585:107093).
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
    // MID → maxRowsInline 8. 8 commands fit one column; 9 overflow into a second.
    setViewport(854, MID)
    expect(layout(8).columnCount).toBe(1)
    const { columnCount, rowsPerColumn } = layout(9)
    expect(columnCount).toBe(2)
    // Fixed capacity, not a balanced average (which would be ceil(9/2) = 5): column 0 fills to 8,
    // column 1 holds the remaining 1.
    expect(rowsPerColumn).toBe(8)
  })

  it('drains the last column as the list narrows instead of rebalancing', () => {
    // The first column stays pinned at capacity (8) while the last column shrinks.
    setViewport(854, MID)
    expect(layout(10).rowsPerColumn).toBe(8)
    expect(layout(9).rowsPerColumn).toBe(8)
  })

  // --- Persistent commands (Cancel / Gesture Cheatsheet) -----------------------------------------

  it('flows persistent commands inline under the last main column when they fit', () => {
    // MID → maxRowsInline 8. 10 main pack 8 + 2; persistent (2) stack under the last (2 + 2 = 4 ≤ 8).
    setViewport(854, MID)
    const { persistentInline, columnCount, rowsPerColumn, visibleRegularCount, persistentColumnIndex } = layout(10, 2)
    expect(persistentInline).toBe(true)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(8)
    expect(visibleRegularCount).toBe(10)
    expect(persistentColumnIndex).toBe(1)
  })

  it('spills persistent into the spare column when the first column is full', () => {
    // Regression: 8 main exactly fill column 0 (capacity 8). Persistent (2) do not fit under it
    // (8 + 2 > 8), but a second column is free, so they flow inline there instead of the bottom row.
    setViewport(854, MID)
    const { persistentInline, columnCount, visibleRegularCount, persistentColumnIndex } = layout(8, 2)
    expect(persistentInline).toBe(true)
    expect(columnCount).toBe(2)
    expect(persistentColumnIndex).toBe(1)
    expect(visibleRegularCount).toBe(8)
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

  it('squeezes persistent under a single column as soon as it truly fits', () => {
    // 854×610: 8 main + the persistent block (2 items + a group-gap row = 11 rows) exactly fit one
    // column. The old floor(gridHeight / pitch) under-counted rows by one (N rows use N−1 gaps) and
    // spilled persistent into a spare second column a row too early; the corrected count keeps the menu
    // a single cohesive column instead.
    setViewport(854, 610)
    const { columnCount, persistentInline, visibleRegularCount } = layout(8, 2)
    expect(columnCount).toBe(1)
    expect(persistentInline).toBe(false)
    expect(visibleRegularCount).toBe(8)
  })

  it('squeezes persistent under a single column in the reported case (837×581)', () => {
    // The reported landscape window: 8 main fill the first column and the persistent block fits under
    // them (~564px of content ≤ 581 once the panel uses the landscape vertical padding it actually
    // renders here, and the full 2-line selected-description slot is still reserved). So persistent tucks
    // under one cohesive column instead of floating in a lone spare column.
    setViewport(837, 581)
    const { columnCount, isMultiColumn, persistentInline } = layout(8, 2)
    expect(columnCount).toBe(1)
    expect(isMultiColumn).toBe(false)
    expect(persistentInline).toBe(false)
  })

  it('drops persistent to a full-width bottom row when main commands overflow', () => {
    // MID → maxRowsInline 8, maxRowsBottom 7 (a full-width bottom row reserves ≈1 row of column height).
    // 16 main overflow both columns and leave no inline slack, so the persistent block becomes the
    // bottom row and every column row holds a main command: capacity is 2 × 7 = 14 — one more visible
    // main command than a vertical inline block (which would reserve ≈3 rows of the last column) allows.
    setViewport(854, MID)
    const { persistentInline, columnCount, rowsPerColumn, visibleRegularCount } = layout(16, 2)
    expect(persistentInline).toBe(false)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(7)
    expect(visibleRegularCount).toBe(14)
  })

  it('squeezes into a single column that fits with landscape padding (825×461)', () => {
    // 825×461: above the md breakpoint the panel renders the smaller landscape vertical padding even when
    // it collapses to one column, so 5 main + the persistent block (~445px) fit one column without
    // cropping. It squeezes into a single cohesive column rather than opening a spare one.
    setViewport(825, 461)
    const { columnCount, isMultiColumn, persistentInline } = layout(5, 2)
    expect(columnCount).toBe(1)
    expect(isMultiColumn).toBe(false)
    expect(persistentInline).toBe(false)
  })

  it('keeps persistent in a spare column when the squeeze genuinely will not fit', () => {
    // Short landscape window (854×MID): 8 main fill the first column but the persistent block does not
    // fit beneath them, so rather than clip it, persistent flows into the free second column.
    setViewport(854, MID)
    const { columnCount, isMultiColumn, persistentInline } = layout(8, 2)
    expect(columnCount).toBe(2)
    expect(isMultiColumn).toBe(true)
    expect(persistentInline).toBe(true)
  })

  it('never flows persistent inline in single column', () => {
    setViewport(390, TALL)
    expect(layout(4, 2).persistentInline).toBe(false)
  })

  // --- Trimming and edges: the grid never overflows (no cropping) --------------------------------

  it('trims regular commands to the grid capacity so nothing crops', () => {
    // 854×MID → 2 columns, maxRowsBottom 7. 30 main can't fit; the persistent block drops to the bottom
    // row and each column fills to 7 rows of main commands, so main trims to 2 × 7 = 14.
    setViewport(854, MID)
    const { columnCount, rowsPerColumn, visibleRegularCount } = layout(30, 2)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(7)
    expect(visibleRegularCount).toBe(14)
    expect(visibleRegularCount).toBeLessThan(30)
  })

  it('budgets the overflow bottom-row layout with the real multi-column padding on short viewports', () => {
    // 854×400 fits 2 columns, so the overflow layout is always multi-column and renders the smaller
    // 1.7rem vertical padding. Budgeting that (instead of the conservative single-column 2.25rem) frees
    // one more row per column — maxRowsBottom 4, not 3 — so 15 main show 2 × 4 = 8 rather than 6, using
    // the space that otherwise sat empty below the persistent row (#4313).
    setViewport(854, 400)
    const { columnCount, rowsPerColumn, visibleRegularCount, persistentInline } = layout(15, 2)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(4)
    expect(visibleRegularCount).toBe(8)
    expect(persistentInline).toBe(false)
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
