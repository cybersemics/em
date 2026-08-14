import { useSelector } from 'react-redux'
import { token } from '../../styled-system/tokens'
import viewportStore from '../stores/viewport'

/**********************************************************************
 * Gesture Menu layout geometry
 *
 * Shared constants + a hook computing the multi-column layout (issue #4313).
 * In hooks/ (not components/GestureMenu/) to avoid a path collision with the
 * in-flight blur branch.
 *
 * Rem values are relative to the 18px default root font size. AppComponent sets
 * `documentElement.style.fontSize` from `state.fontSize`, so rem widths scale
 * with the user's font size; the hook reads `state.fontSize` as the rem basis.
 **********************************************************************/

/** Mobile-portrait breakpoint in px (`md` in panda.config.ts).*/
export const GESTURE_MENU_MD_BREAKPOINT = parseInt(token('breakpoints.md'))

/** Minimum column width, 280px ÷ 18 at the default root font size. */
export const GESTURE_MENU_MIN_COLUMN_WIDTH_REM = 15.556

/** Gap between columns. 35px ÷ 18 at the default root font size. */
export const GESTURE_MENU_COLUMN_GAP_REM = 1.944

/**
 * Horizontal panel padding when the viewport has room for more than one column (90px per side in both
 * multi-column mockups = 5rem at the 18px default root). Keyed on `maxColumns` — how many columns
 * *fit* — never on `columnCount` / `isMultiColumn`, which is how many the commands currently occupy.
 * The two diverge as a gesture narrows the list, and the padding must not move when they do.
 */
export const GESTURE_MENU_PANEL_PADDING_HORIZONTAL_MULTI_COLUMN_FIT_REM = 5

/**
 * Horizontal panel padding when one column is all that fits — at any width, not just below `md`. The
 * wide gutters above are a multi-column value; at one column they would be most of the panel.
 */
export const GESTURE_MENU_PANEL_PADDING_HORIZONTAL_SINGLE_COLUMN_FIT_REM = 2.25

/**
 * Vertical panel padding when the viewport has room for more than one column. Tighter than the
 * single-column value, which is what reclaims ~0.5 row of column height in landscape.
 */
export const GESTURE_MENU_PANEL_PADDING_VERTICAL_MULTI_COLUMN_FIT_REM = 1.7

/** Vertical panel padding when one column is all that fits (the original, roomier value). */
export const GESTURE_MENU_PANEL_PADDING_VERTICAL_SINGLE_COLUMN_FIT_REM = 2.25

/** Vertical gap between command rows (existing literal). */
export const GESTURE_MENU_ROW_GAP_REM = 1.2

// "Gestures" header sub-parts — mirror the inline styles in GestureMenu.tsx; keep in sync if those change.
/** "Gestures" label font size (approximates its line height for the height budget). */
export const GESTURE_MENU_HEADER_LABEL_FONT_SIZE_REM = 0.9 // fontSize, GestureMenu.tsx
/** Bottom margin below the "Gestures" label, above the divider. */
export const GESTURE_MENU_HEADER_LABEL_MARGIN_BOTTOM_REM = 0.444 // label marginBottom, GestureMenu.tsx
/** Divider height, 1px ÷ 18 at the default root font size. Rendered as a literal 1px hairline (not scaled). */
const GESTURE_MENU_HEADER_DIVIDER_HEIGHT_REM = 0.056
/** Bottom margin below the whole header block, above the grid. */
export const GESTURE_MENU_HEADER_MARGIN_BOTTOM_REM = 1.389 // header block marginBottom, GestureMenu.tsx

/** Approximate height of the "Gestures" header block: label line + its margin + divider + block margin (≈2.8rem). */
export const GESTURE_MENU_HEADER_HEIGHT_REM =
  GESTURE_MENU_HEADER_LABEL_FONT_SIZE_REM +
  GESTURE_MENU_HEADER_LABEL_MARGIN_BOTTOM_REM +
  GESTURE_MENU_HEADER_DIVIDER_HEIGHT_REM +
  GESTURE_MENU_HEADER_MARGIN_BOTTOM_REM

/** Approximate row pitch of an unselected row: the icon/label height (1rem) plus the row gap. */
export const GESTURE_MENU_ROW_PITCH_REM = 1 + GESTURE_MENU_ROW_GAP_REM

// Source of truth for GestureMenuItem.tsx's selected-state styling — imported there so the two
// never drift apart.
export const GESTURE_MENU_ITEM_SELECTED_PADDING_TOP_REM = 0.6
export const GESTURE_MENU_ITEM_LABEL_DESCRIPTION_GAP_REM = 0.5
export const GESTURE_MENU_ITEM_DESCRIPTION_LINE_HEIGHT_REM = 1.1
const GESTURE_MENU_ITEM_DESCRIPTION_MAX_LINES = 2
export const GESTURE_MENU_ITEM_SELECTED_PADDING_BOTTOM_REM = 0.1

/**
 * Extra height a selected command's row adds over a plain row, so its expanded description never crops
 * the column. Budgets the two-line worst case — costs one or two commands when a description wraps, but
 * the reviewer prefers that to a clipped menu.
 */
export const GESTURE_MENU_SELECTED_ROW_REM =
  GESTURE_MENU_ITEM_SELECTED_PADDING_TOP_REM +
  GESTURE_MENU_ITEM_LABEL_DESCRIPTION_GAP_REM +
  GESTURE_MENU_ITEM_DESCRIPTION_MAX_LINES * GESTURE_MENU_ITEM_DESCRIPTION_LINE_HEIGHT_REM +
  GESTURE_MENU_ITEM_SELECTED_PADDING_BOTTOM_REM

/** Number of trailing single-column rows that fade into the fog when the list overflows (issue #3801 §4). */
export const GESTURE_MENU_FOG_ROW_COUNT = 4

/** The computed multi-column Gesture Menu layout returned by {@link useGestureMenuLayout}. */
type GestureMenuLayout = {
  /** Number of columns to render. */
  columnCount: number
  /**
   * How many columns the viewport width can hold, independent of how many the commands actually need.
   * Column *width* is derived from this rather than from `columnCount` so that a column stays the same
   * width as the gesture narrows the command list — refining `r` → `rdl` drops columns without resizing
   * the ones that remain.
   */
  maxColumns: number
  /**
   * Horizontal panel padding per side, in rem. Returned (rather than re-derived in the component) so
   * the rendered padding is always the one this hook budgeted against.
   */
  horizontalPaddingRem: number
  /**
   * Vertical panel padding per side, in rem. Returned for the same reason as `horizontalPaddingRem`:
   * this is the value the row budget below is computed against, so the component must render this one
   * and not re-derive it. Deriving it separately is what let the rendered 2.25rem drift from the
   * budgeted 1.7rem and cost the column ~0.5 row it had already been given.
   */
  verticalPaddingRem: number
  /** Rows per column (capped by available height so trimming has a defined capacity). */
  rowsPerColumn: number
  /** Number of commands actually rendered (may be trimmed when they overflow the grid). */
  visibleCommandCount: number
  /** True below the `md` breakpoint — the menu stays single-column and keeps its mobile-portrait behavior. */
  isMobilePortrait: boolean
  /** True when the menu renders more than one column (`columnCount > 1`). */
  isMultiColumn: boolean
}

/**
 * Compute the multi-column Gesture Menu layout: column count, rows per column, and how many commands
 * survive trimming. Every command is laid out identically — Cancel and Command Universe are ordinary
 * list items sorted to the end (see `useFilteredCommands`), so they flow, wrap, and trim like any
 * other. Reactively reads viewport dimensions (`viewportStore`) and the rem basis (`state.fontSize`).
 */
const useGestureMenuLayout = (
  /** Number of commands to lay out. */
  commandCount: number,
): GestureMenuLayout => {
  const remPx = useSelector(state => state.fontSize)
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)

  const isMobilePortrait = innerWidth < GESTURE_MENU_MD_BREAKPOINT

  const availableHeightPx = innerHeight

  const minColumnPx = GESTURE_MENU_MIN_COLUMN_WIDTH_REM * remPx
  const gapPx = GESTURE_MENU_COLUMN_GAP_REM * remPx

  // How many columns the viewport can render: N columns need N widths + (N−1)
  // gaps, measured against the multi-column padding. This is only an upper limit; we might render fewer columns depending
  // on how many the commands actually needed
  const maxColumns = isMobilePortrait
    ? 1
    : Math.max(
        1,
        Math.floor(
          (innerWidth - 2 * GESTURE_MENU_PANEL_PADDING_HORIZONTAL_MULTI_COLUMN_FIT_REM * remPx + gapPx) /
            (minColumnPx + gapPx),
        ),
      )

  // Both paddings key on `maxColumns` — how many columns *fit* — never on `columnCount`, so a gesture
  // that narrows the list drops columns without shifting the panel. Wherever the viewport could hold
  // more than one column the panel takes the wider gutters horizontally and the *tighter* 1.7rem
  // vertically; the latter is what reclaims ~0.5 row of column height on short and landscape viewports.
  // Both are returned, so the component renders exactly what the budget below is computed against.
  const fitsMultiColumn = maxColumns > 1
  const horizontalPaddingRem = fitsMultiColumn
    ? GESTURE_MENU_PANEL_PADDING_HORIZONTAL_MULTI_COLUMN_FIT_REM
    : GESTURE_MENU_PANEL_PADDING_HORIZONTAL_SINGLE_COLUMN_FIT_REM
  const verticalPaddingRem = fitsMultiColumn
    ? GESTURE_MENU_PANEL_PADDING_VERTICAL_MULTI_COLUMN_FIT_REM
    : GESTURE_MENU_PANEL_PADDING_VERTICAL_SINGLE_COLUMN_FIT_REM

  // Row, header and padding heights, used to work out how many rows fit in a column.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const rowGapPx = GESTURE_MENU_ROW_GAP_REM * remPx
  const headerPx = GESTURE_MENU_HEADER_HEIGHT_REM * remPx
  const verticalPaddingPx = 2 * verticalPaddingRem * remPx

  // Extra height for the selected command's expanded description so it never crops the column bottom
  // (the multi-column menu doesn't scroll). One command is selected whenever a gesture is in progress.
  const selectedRowPx = GESTURE_MENU_SELECTED_ROW_REM * remPx
  const gridHeightPx = availableHeightPx - headerPx - verticalPaddingPx - selectedRowPx

  /**
   * How many command rows fit in `heightPx` of column height. N stacked rows span N·pitch − rowGap (the
   * last row has no trailing gap), so we add one rowGap back before flooring — otherwise the count is
   * short by up to a full row and a column gives away capacity it actually has.
   **/
  const findNumOfRowsFittingIn = (heightPx: number) => Math.max(1, Math.floor((heightPx + rowGapPx) / rowPitchPx))

  // One capacity for every row, because every command is the same kind of row. Nothing is reserved at
  // the bottom of a column: Cancel and Command Universe are ordinary items at the end of the list, so
  // when the list overflows they are trimmed like any other command rather than displacing one.
  const rowsPerColumn = findNumOfRowsFittingIn(gridHeightPx)

  // The intention is to fill the commands top-to-bottom, left-to-right, so the layout is more compact
  // and once we're down to one column, this is identical to the single-column mobile layout.
  const columnCount = Math.min(maxColumns, Math.max(1, Math.ceil(commandCount / rowsPerColumn)))

  // Trim to what the open columns can actually hold, so neither layout ever crops a partially drawn
  // row. At one column this is the single-column cap: the list stops at the last fully visible row and
  // the component fogs the trailing ones instead of scrolling (issue #3801 §4).
  const visibleCommandCount = Math.min(commandCount, columnCount * rowsPerColumn)

  return {
    columnCount,
    maxColumns,
    horizontalPaddingRem,
    verticalPaddingRem,
    rowsPerColumn,
    visibleCommandCount,
    isMobilePortrait,
    isMultiColumn: columnCount > 1,
  }
}

export default useGestureMenuLayout
