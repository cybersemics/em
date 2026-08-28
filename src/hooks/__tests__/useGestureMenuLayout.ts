import { renderHook } from '@testing-library/react'
import React, { act } from 'react'
import { Provider } from 'react-redux'
import { token } from '../../../styled-system/tokens'
import { fontSizeActionCreator } from '../../actions/fontSize'
import store from '../../stores/app'
import viewportStore from '../../stores/viewport'
import useGestureMenuLayout, {
  APPROXIMATE_ROW_HEIGHT_REM,
  CAPACITOR_TOP_PADDING_REM,
  COLUMN_GAP_REM,
  ESTIMATED_HEADER_HEIGHT_REM,
  ESTIMATED_SELECTED_ITEM_EXTRA_HEIGHT_REM,
  MIN_COLUMN_WIDTH_REM,
  MULTI_COLUMN_BLOCK_PADDING_REM,
  MULTI_COLUMN_INLINE_PADDING_REM,
  ROW_GAP_REM,
  SINGLE_COLUMN_BLOCK_PADDING_REM,
  SINGLE_COLUMN_INLINE_PADDING_REM,
  TABLET_AVAILABLE_HEIGHT_RATIO,
} from '../useGestureMenuLayout'

/**
 * `isTablet` is a module-level constant in the real `browser.ts`, so it cannot be changed per test.
 * A getter over a mutable holder lets most of this file run as a non-tablet — which is what keeps the
 * pre-existing cases exercising the untouched code path — while the tablet cases flip it via `asTablet`.
 */
const mockBrowser = { isTablet: false, isBrowser: true }
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return {
    ...actual,
    get isTablet() {
      return mockBrowser.isTablet
    },
    get isBrowser() {
      return mockBrowser.isBrowser
    },
  }
})

/** Evaluates fn as though the app were running under Capacitor rather than in a browser. */
const underCapacitor = <T>(fn: () => T): T => {
  mockBrowser.isBrowser = false
  try {
    return fn()
  } finally {
    mockBrowser.isBrowser = true
  }
}

/** Evaluates fn as though the app were running on a tablet. */
const asTablet = <T>(fn: () => T): T => {
  mockBrowser.isTablet = true
  try {
    return fn()
  } finally {
    mockBrowser.isTablet = false
  }
}

/** Redux Provider wrapper so the hook can read state.fontSize. */
const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store, children })

/** Sets the viewport dimensions the hook reads. */
const setViewport = (innerWidth: number, innerHeight: number) => {
  act(() => {
    viewportStore.update({ innerWidth, innerHeight })
  })
}

/** Renders the hook with the current store/viewport and returns the layout result. */
const layout = (commandCount: number) =>
  renderHook(() => useGestureMenuLayout(commandCount), { wrapper }).result.current

// Viewport heights chosen (at the 18px default root) to yield known per-column capacities above the
// two-column width breakpoint:
//   TALL  → rowsPerColumn 121 (a column never fills, so packing collapses to a single column)
//   MID   → rowsPerColumn 8
//   SHORT → rowsPerColumn 3
/** The root font size the beforeEach below installs, i.e. 1rem in px. */
const REM = 18

const TALL = 5000
const MID = 490
const SHORT = 290

describe('useGestureMenuLayout', () => {
  beforeEach(() => {
    store.dispatch({ type: 'clear', full: true })
    // Default root font size: 1rem = 18px. Min column 279px, gap 36px → stride 315px.
    act(() => {
      store.dispatch(fontSizeActionCreator(REM))
    })
  })

  // --- Width cap: columns never exceed what fits the viewport ---------------------------------
  // Each case supplies enough commands to overflow the columns, so the packed column count is bounded
  // by the width cap rather than by the command count.

  it('caps at one column just below the two-column width threshold', () => {
    // maxColumns is measured against the WIDE multi-column padding — a second column opens only if it
    // still fits at the gutters the panel renders once it has opened. Two columns need 594px of content
    // (2 × 279 + 36 gap, the rem constants at an 18px root), reached at 594 + 180 = 774px, so 773px is
    // the last single-column width.
    setViewport(773, SHORT)
    expect(layout(10).columnCount).toBe(1)
  })

  it('allows two columns just above the width threshold', () => {
    // 774px − 180px wide padding = 594px inner width, the first width holding two columns.
    setViewport(774, SHORT)
    expect(layout(10).columnCount).toBe(2)
  })

  it('caps at two columns at desktop-820 geometry', () => {
    setViewport(820, SHORT)
    expect(layout(10).columnCount).toBe(2)
  })

  it('caps at two columns at desktop-854 geometry', () => {
    // 854px panel − 180px wide padding = 674px, two minimum-width columns (594px) with room to spare
    // but short of a third (909px). Matches mockup 6586:107957.
    setViewport(854, SHORT)
    expect(layout(10).columnCount).toBe(2)
  })

  it('caps at three columns at iPad-1177 geometry', () => {
    // 1177px frame − 180px wide padding = 997px, three minimum-width columns (909px) and not a fourth
    // (1224px). Matches mockup 6585:107093.
    setViewport(1177, SHORT)
    expect(layout(15).columnCount).toBe(3)
  })

  it('falls back to one column on a narrow landscape viewport', () => {
    // 600px − 180px wide padding = 420px, fits fewer than two minimum-width columns.
    setViewport(600, SHORT)
    expect(layout(10).columnCount).toBe(1)
  })

  it('forces one column below the md breakpoint', () => {
    setViewport(390, TALL)
    const { columnCount, isMobilePortrait } = layout(12)
    expect(columnCount).toBe(1)
    expect(isMobilePortrait).toBe(true)
  })

  // --- Horizontal panel padding: the wide gutters are a multi-column value ------------------------

  it('narrows the panel padding when only one column fits', () => {
    // 404px is 4px above the md breakpoint. At the wide 5rem (90px) gutters it would leave 224px of
    // content — under the 279px minimum column — so maxColumns floors to 1. A single-column panel takes
    // the narrow padding instead: 40.5px per side, 323px of content.
    setViewport(404, TALL)
    const { maxColumns, horizontalPaddingRem, isMobilePortrait } = layout(12)
    expect(isMobilePortrait).toBe(false)
    expect(maxColumns).toBe(1)
    expect(horizontalPaddingRem).toBe(SINGLE_COLUMN_INLINE_PADDING_REM)
  })

  it('keeps the wide padding once a second column fits', () => {
    setViewport(854, SHORT)
    const { maxColumns, horizontalPaddingRem } = layout(10)
    expect(maxColumns).toBe(2)
    expect(horizontalPaddingRem).toBe(MULTI_COLUMN_INLINE_PADDING_REM)
  })

  it('keeps the narrow padding below the md breakpoint', () => {
    setViewport(390, TALL)
    expect(layout(12).horizontalPaddingRem).toBe(SINGLE_COLUMN_INLINE_PADDING_REM)
  })

  it('stays single-column when a second column would not fit the wide padding', () => {
    // The reported case. 729px could physically hold two columns — 648px of content at the narrow
    // padding — but a two-column panel renders the wide gutters, leaving only 549px, short of the 594px
    // two minimum-width columns need. Measuring maxColumns against the padding the panel
    // would actually render is what keeps a column from opening at a width it cannot honour: the
    // menu stays at one column, which then takes the narrow padding.
    setViewport(729, SHORT)
    const { maxColumns, columnCount, horizontalPaddingRem } = layout(10)
    expect(maxColumns).toBe(1)
    expect(columnCount).toBe(1)
    expect(horizontalPaddingRem).toBe(SINGLE_COLUMN_INLINE_PADDING_REM)
  })

  it('never opens a column narrower than the minimum width', () => {
    // The invariant the wide-padding basis buys, and the reason the 675–773px band stays single-column:
    // whenever more than one column opens, the content left by the wide gutters divides into columns
    // that are each at least MIN_COLUMN_WIDTH_REM. Mirrors the hook's own columnWidth:
    // calc((100% − (maxColumns−1) × gap) / maxColumns), resolved against the padded content box.
    //
    // Sampled every 10px across the whole range, then every 1px around the two- and three-column
    // thresholds (773/774 and 1088/1089) — an off-by-one in the basis surfaces there and nowhere else.
    // A full 1px sweep of the range renders the hook 1000× and exceeds the 5s test timeout.
    const rem = 18
    const coarse = []

    const mdBreakpoint = parseInt(token('breakpoints.md'))

    for (let w = mdBreakpoint; w <= 1400; w += 10) coarse.push(w)
    const fine = []
    for (const threshold of [774, 1089]) {
      for (let w = threshold - 8; w <= threshold + 8; w += 1) fine.push(w)
    }
    let multiColumnWidths = 0
    for (const innerWidth of [...coarse, ...fine]) {
      setViewport(innerWidth, SHORT)
      const { maxColumns } = layout(30)
      if (maxColumns === 1) continue
      multiColumnWidths++
      const contentPx = innerWidth - 2 * MULTI_COLUMN_INLINE_PADDING_REM * rem
      const columnPx = (contentPx - (maxColumns - 1) * COLUMN_GAP_REM * rem) / maxColumns
      expect(columnPx).toBeGreaterThanOrEqual(MIN_COLUMN_WIDTH_REM * rem)
    }
    // Guards the sweep against passing vacuously: a regression pinning maxColumns to 1 would skip every
    // assertion above and still report green.
    expect(multiColumnWidths).toBeGreaterThan(0)
  })

  it('keeps the padding fixed as a narrowing gesture drains columns', () => {
    // Rule 2: the padding depends on maxColumns (a property of the viewport), never on columnCount. At
    // 854×MID a long list occupies both columns and a short one only the first; the padding is the same.
    setViewport(854, MID)
    const many = layout(16)
    const few = layout(3)
    expect(many.columnCount).toBe(2)
    expect(few.columnCount).toBe(1)
    expect(few.horizontalPaddingRem).toBe(many.horizontalPaddingRem)
    expect(few.maxColumns).toBe(many.maxColumns)
  })

  // --- Vertical panel padding: rendered must equal budgeted ---------------------------------------
  // The component renders `verticalPaddingRem` straight from the hook instead of re-deriving it, so
  // these also pin what the panel paints. Regression guard: the value was briefly derived twice, and
  // the render silently fell back to the roomier single-column padding while the row budget kept
  // spending the tighter multi-column one — costing the column ~0.5 row it had already been given.

  it('tightens the vertical padding once a second column fits', () => {
    setViewport(854, SHORT)
    const { maxColumns, verticalPaddingRem } = layout(10)
    expect(maxColumns).toBe(2)
    expect(verticalPaddingRem).toBe(MULTI_COLUMN_BLOCK_PADDING_REM)
  })

  it('keeps the roomier vertical padding when only one column fits', () => {
    // 404px is above md but holds one column, so it takes the single-column value on both axes.
    setViewport(404, TALL)
    const { maxColumns, verticalPaddingRem, isMobilePortrait } = layout(12)
    expect(isMobilePortrait).toBe(false)
    expect(maxColumns).toBe(1)
    expect(verticalPaddingRem).toBe(SINGLE_COLUMN_BLOCK_PADDING_REM)
  })

  it('keeps the roomier vertical padding below the md breakpoint', () => {
    setViewport(390, TALL)
    expect(layout(12).verticalPaddingRem).toBe(SINGLE_COLUMN_BLOCK_PADDING_REM)
  })

  it('budgets the row count against the vertical padding it reports', () => {
    // The invariant the regression broke: a full column plus the header, BOTH reported vertical
    // paddings and the selected-row reserve must fit the viewport. Spends verticalPaddingRem itself
    // rather than a hardcoded constant, so the budget and the rendered padding cannot diverge again.
    setViewport(854, MID)
    const { rowsPerColumn, verticalPaddingRem } = layout(30)
    const rem = 18
    const columnPx = rowsPerColumn * APPROXIMATE_ROW_HEIGHT_REM * rem - ROW_GAP_REM * rem
    const chromePx =
      (ESTIMATED_HEADER_HEIGHT_REM + 2 * verticalPaddingRem + ESTIMATED_SELECTED_ITEM_EXTRA_HEIGHT_REM) * rem
    expect(columnPx + chromePx).toBeLessThanOrEqual(MID)
  })

  it('holds the vertical padding fixed as a narrowing gesture drains columns', () => {
    // Same rule as the horizontal padding: keyed on maxColumns, never on columnCount. A gesture that
    // empties a column must not change the panel's vertical padding — or its row budget.
    setViewport(854, MID)
    const many = layout(16)
    const few = layout(3)
    expect(many.columnCount).toBe(2)
    expect(few.columnCount).toBe(1)
    expect(few.verticalPaddingRem).toBe(many.verticalPaddingRem)
    expect(few.rowsPerColumn).toBe(many.rowsPerColumn)
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
    // MID → rowsPerColumn 8. 8 commands fit one column; 9 overflow into a second.
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

  // --- Trimming and edges: the grid never overflows (no cropping) --------------------------------

  it('gives every column row to a command, reserving nothing at the bottom', () => {
    // Cancel and Command Universe are ordinary end-of-list commands, so no bottom row is reserved for
    // them: capacity is columnCount × rowsPerColumn exactly. MID → rowsPerColumn 8, so 16 commands fill
    // 2 × 8 with nothing held back (the old persistent bottom row reserved ≈1 row per column, capping
    // this at 14).
    setViewport(854, MID)
    const { columnCount, rowsPerColumn, visibleCommandCount } = layout(16)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(8)
    expect(visibleCommandCount).toBe(16)
    expect(visibleCommandCount).toBe(columnCount * rowsPerColumn)
  })

  it('trims commands to the grid capacity so nothing crops', () => {
    // 854×MID → 2 columns, rowsPerColumn 8. 30 commands can't fit, so the list trims to 2 × 8 = 16.
    // The trimmed tail includes Cancel and Command Universe — they are not exempt.
    setViewport(854, MID)
    const { columnCount, rowsPerColumn, visibleCommandCount } = layout(30)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(8)
    expect(visibleCommandCount).toBe(16)
    expect(visibleCommandCount).toBeLessThan(30)
  })

  it('budgets short viewports with the real multi-column padding', () => {
    // 854×400 fits 2 columns, so the panel renders the smaller 1.7rem vertical padding. Budgeting that
    // (instead of the conservative single-column 2.25rem) frees roughly half a row per column.
    setViewport(854, 400)
    const { columnCount, rowsPerColumn, visibleCommandCount } = layout(15)
    expect(columnCount).toBe(2)
    expect(rowsPerColumn).toBe(6)
    expect(visibleCommandCount).toBe(12)
  })

  it('reserves the panel bottom padding in the multi-column row budget', () => {
    // Rule 3: a full column plus the header and BOTH vertical paddings must still fit the viewport, so
    // the last row never butts against the bottom edge. Reproduces the hook's own budget: header
    // (2.789rem) + 2 × landscape padding (1.7rem) + a full column of rows + the reserved selected-row
    // expansion (3.4rem). N rows span N × pitch − one trailing gap.
    setViewport(854, MID)
    const { rowsPerColumn } = layout(30)
    const rem = 18
    const columnPx = rowsPerColumn * APPROXIMATE_ROW_HEIGHT_REM * rem - ROW_GAP_REM * rem
    const chromePx =
      (ESTIMATED_HEADER_HEIGHT_REM + 2 * MULTI_COLUMN_BLOCK_PADDING_REM + ESTIMATED_SELECTED_ITEM_EXTRA_HEIGHT_REM) *
      rem
    expect(columnPx + chromePx).toBeLessThanOrEqual(MID)
  })

  it('never trims below zero', () => {
    setViewport(390, 300)
    expect(layout(30).visibleCommandCount).toBeGreaterThanOrEqual(0)
  })

  it('handles zero commands', () => {
    setViewport(1177, TALL)
    const { columnCount, visibleCommandCount } = layout(0)
    expect(columnCount).toBe(1)
    expect(visibleCommandCount).toBe(0)
  })

  it('scales the column count with the runtime font size', () => {
    // At the default font size, 10 commands on a short 2-column viewport use both columns. At 2×
    // font the 279px minimum column doubles, dropping desktop-854 to a single column.
    setViewport(854, SHORT)
    expect(layout(10).columnCount).toBe(2)
    act(() => {
      store.dispatch(fontSizeActionCreator(36))
    })
    expect(layout(10).columnCount).toBe(1)
  })

  describe('narrow-tablet second column', () => {
    /** The rendered width of one column, in px, for a layout the hook has just returned. */
    const columnPx = (innerWidth: number, { maxColumns, horizontalPaddingRem }: ReturnType<typeof layout>) =>
      (innerWidth - 2 * horizontalPaddingRem * REM - (maxColumns - 1) * COLUMN_GAP_REM * REM) / maxColumns

    it('opens a second column on a tablet the wide gutters hold to one', () => {
      // iPad mini portrait: 744 − 2×5rem leaves 564px and two minimum columns need 594px, but
      // 744 − 2×2.25rem leaves 663px, which fits them. The padding refuses the column, not the screen.
      setViewport(744, 1133)
      const result = asTablet(() => layout(28))
      expect(result.maxColumns).toBe(2)
      expect(result.horizontalPaddingRem).toBe(SINGLE_COLUMN_INLINE_PADDING_REM)
    })

    it('keeps a retried column at least the minimum column width', () => {
      setViewport(744, 1133)
      const result = asTablet(() => layout(28))
      expect(columnPx(744, result)).toBeGreaterThanOrEqual(MIN_COLUMN_WIDTH_REM * REM)
    })

    it('tightens the vertical padding on a retried tablet, like any other multi-column viewport', () => {
      setViewport(744, 1133)
      expect(asTablet(() => layout(28)).verticalPaddingRem).toBe(MULTI_COLUMN_BLOCK_PADDING_REM)
    })

    it('does not retry on a tablet that already fits two columns at the wide padding', () => {
      setViewport(834, 1194)
      const result = asTablet(() => layout(28))
      expect(result.maxColumns).toBe(2)
      expect(result.horizontalPaddingRem).toBe(MULTI_COLUMN_INLINE_PADDING_REM)
    })

    it('does not retry at 12.9-inch geometry in either orientation', () => {
      setViewport(1024, 1366)
      const portrait = asTablet(() => layout(28))
      expect(portrait.maxColumns).toBe(2)
      expect(portrait.horizontalPaddingRem).toBe(MULTI_COLUMN_INLINE_PADDING_REM)

      setViewport(1366, 1024)
      const landscape = asTablet(() => layout(28))
      expect(landscape.maxColumns).toBe(3)
      expect(landscape.horizontalPaddingRem).toBe(MULTI_COLUMN_INLINE_PADDING_REM)
    })

    it('does not retry when the device is not a tablet', () => {
      // the same geometry as the first case, so only isTablet distinguishes them
      setViewport(744, 1133)
      const result = layout(28)
      expect(result.maxColumns).toBe(1)
      expect(result.horizontalPaddingRem).toBe(SINGLE_COLUMN_INLINE_PADDING_REM)
    })

    it('leaves a tablet too narrow for two columns at either padding on one column', () => {
      setViewport(600, 1000)
      expect(asTablet(() => layout(28)).maxColumns).toBe(1)
    })
  })

  describe('tablet safe zone', () => {
    // The hand holding a tablet covers the bottom of the screen, so a tablet's list is capped at 44% of
    // innerHeight and the overflow is trimmed. Expected values are the full ~28-command list at an 18px
    // root; shorter lists trim less or not at all.
    const DEVICES = [
      { name: 'iPad mini portrait', w: 744, h: 1133, maxColumns: 2, rows: 8, columns: 2, visible: 16 },
      { name: 'iPad mini landscape', w: 1133, h: 744, maxColumns: 3, rows: 4, columns: 3, visible: 12 },
      { name: 'iPad 11 portrait', w: 834, h: 1194, maxColumns: 2, rows: 9, columns: 2, visible: 18 },
      { name: 'iPad 11 landscape', w: 1194, h: 834, maxColumns: 3, rows: 5, columns: 3, visible: 15 },
      { name: 'iPad 12.9 portrait', w: 1024, h: 1366, maxColumns: 2, rows: 11, columns: 2, visible: 22 },
      { name: 'iPad 12.9 landscape', w: 1366, h: 1024, maxColumns: 3, rows: 7, columns: 3, visible: 21 },
    ]

    DEVICES.forEach(({ name, w, h, maxColumns, rows, columns, visible }) => {
      it(`caps the column at the safe zone on ${name}`, () => {
        setViewport(w, h)
        const result = asTablet(() => layout(28))
        expect({
          maxColumns: result.maxColumns,
          rows: result.rowsPerColumn,
          columns: result.columnCount,
          visible: result.visibleCommandCount,
        }).toEqual({ maxColumns, rows, columns, visible })
      })
    })

    it('budgets the rows against 44% of the viewport height, not the whole viewport', () => {
      // Derived from the ratio rather than hardcoded, so changing the constant moves this expectation
      // with it and the device rows above become the thing that has to be re-measured.
      setViewport(1024, 1366)
      const overheadRem =
        ESTIMATED_HEADER_HEIGHT_REM + 2 * MULTI_COLUMN_BLOCK_PADDING_REM + ESTIMATED_SELECTED_ITEM_EXTRA_HEIGHT_REM
      const expected = Math.floor(
        (1366 * TABLET_AVAILABLE_HEIGHT_RATIO - overheadRem * REM + ROW_GAP_REM * REM) /
          (APPROXIMATE_ROW_HEIGHT_REM * REM),
      )
      expect(asTablet(() => layout(28)).rowsPerColumn).toBe(expected)
    })

    it('does not trim a list that already fits inside the safe zone', () => {
      setViewport(1024, 1366)
      const result = asTablet(() => layout(8))
      expect(result.visibleCommandCount).toBe(8)
    })

    it('leaves non-tablet geometry on the full viewport height', () => {
      // The same three viewports as above. Only isTablet distinguishes them, so any change here means
      // the cap has leaked off tablets.
      setViewport(744, 1133)
      expect(layout(28).rowsPerColumn).toBe(24)

      setViewport(1024, 1366)
      expect({ rows: layout(28).rowsPerColumn, visible: layout(28).visibleCommandCount }).toEqual({
        rows: 30,
        visible: 28,
      })

      setViewport(1366, 1024)
      expect({ rows: layout(28).rowsPerColumn, visible: layout(28).visibleCommandCount }).toEqual({
        rows: 22,
        visible: 28,
      })
    })

    it('leaves phone geometry untouched', () => {
      setViewport(402, 874)
      expect(layout(28).rowsPerColumn).toBe(17)

      setViewport(874, 402)
      const landscape = layout(28)
      expect({ columns: landscape.columnCount, rows: landscape.rowsPerColumn }).toEqual({ columns: 2, rows: 6 })
    })
  })

  describe('top padding', () => {
    it('takes the tighter Capacitor top padding when only one column fits', () => {
      setViewport(393, 852)
      expect(underCapacitor(() => layout(28)).paddingTopRem).toBe(CAPACITOR_TOP_PADDING_REM)
    })

    it('uses the ordinary vertical padding in a browser at the same size', () => {
      setViewport(393, 852)
      expect(layout(28).paddingTopRem).toBe(SINGLE_COLUMN_BLOCK_PADDING_REM)
    })

    it('does not move when a narrowing gesture drains a column under Capacitor', () => {
      // The regression: paddingTop was keyed on columnCount, so an iPad Air dropping from two columns
      // to one swapped 1.7rem for the 0.75rem Capacitor value and the header jumped ~0.95rem mid-gesture.
      setViewport(820, 1180)
      const twoColumns = underCapacitor(() => layout(28))
      const oneColumn = underCapacitor(() => layout(2))
      expect(twoColumns.columnCount).toBeGreaterThan(1)
      expect(oneColumn.columnCount).toBe(1)
      expect(oneColumn.paddingTopRem).toBe(twoColumns.paddingTopRem)
    })

    it('matches the vertical padding wherever more than one column fits', () => {
      setViewport(820, 1180)
      const result = underCapacitor(() => layout(28))
      expect(result.paddingTopRem).toBe(result.verticalPaddingRem)
    })
  })
})
