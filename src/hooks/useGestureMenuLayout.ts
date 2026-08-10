import { useSelector } from 'react-redux'
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

/** Mobile-portrait breakpoint in px (`md` in panda.config.ts). Below this the menu is single-column. */
export const GESTURE_MENU_MD_BREAKPOINT_PX = 400

/** Minimum column width, 280px ÷ 18 at the default root font size. */
export const GESTURE_MENU_MIN_COLUMN_WIDTH_REM = 15.556

/** Gap between columns. 35px ÷ 18 at the default root font size. */
export const GESTURE_MENU_COLUMN_GAP_REM = 1.944

/** Horizontal panel padding above the `md` breakpoint (90px per side in both mockups = 5rem at the 18px default root). */
export const GESTURE_MENU_PANEL_PADDING_MD_REM = 5

/**
 * The single-column panel padding (existing value). Used for the horizontal padding whenever only one
 * column fits — at any width, not just below `md` — and for the vertical padding in mobile portrait
 * (see GestureMenu.tsx `horizontalPadding` / `verticalPadding`). Multi-column uses `_MD_REM`
 * horizontally; above `md` the vertical padding is always `_VERTICAL_MD_REM`.
 */
export const GESTURE_MENU_PANEL_PADDING_REM = 2.25

/** Vertical panel padding above the `md` breakpoint (multi-column). */
export const GESTURE_MENU_PANEL_PADDING_VERTICAL_MD_REM = 1.7

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
   * Horizontal panel padding per side, in rem. The wide `_MD_REM` gutters are a multi-column value —
   * they come from the two- and three-column mockups, where they are a small fraction of the panel. At
   * one column they would be most of it, so a single-column panel uses the narrow `_REM` value at every
   * width. Returned (rather than re-derived in the component) so the rendered padding is always the one
   * this hook budgeted against.
   */
  horizontalPaddingRem: number
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

  const isMobilePortrait = innerWidth < GESTURE_MENU_MD_BREAKPOINT_PX

  const availableHeightPx = innerHeight

  const minColumnPx = GESTURE_MENU_MIN_COLUMN_WIDTH_REM * remPx
  const gapPx = GESTURE_MENU_COLUMN_GAP_REM * remPx

  // How many minimum-width columns the viewport can PHYSICALLY hold: N columns need N widths + (N−1)
  // gaps, measured against the narrow padding. Padding and column count are mutually dependent
  // (padding ← columns ← width ← padding), and pinning the count to the narrow padding is what breaks
  // the loop — `maxColumns` then describes the viewport alone, and the padding is derived from it
  // rather than the reverse. This is only an upper limit; the packed layout below may use fewer,
  // however many the commands actually need.
  const maxColumns = isMobilePortrait
    ? 1
    : Math.max(1, Math.floor((innerWidth - 2 * GESTURE_MENU_PANEL_PADDING_REM * remPx + gapPx) / (minColumnPx + gapPx)))

  // The wide mockup gutters are a multi-column value — 90px per side is a small share of a three-column
  // panel, but at 404px it would leave 224px of content, under the minimum for even one column. So they
  // apply whenever a second column is available, and never at one column. Keyed on `maxColumns`, not on
  // how many columns the commands currently occupy, so refining a gesture never shifts the padding.
  //
  // Two columns need ~595px of content, which the narrow padding reaches at 677px — but the panel then
  // switches to the wide padding, leaving only ~514px for them. So between 677px and 775px the columns
  // render narrower than `GESTURE_MENU_MIN_COLUMN_WIDTH_REM` (231px at 677, 257px at 729). That
  // constant is the threshold for opening a column, not a floor on its rendered width.
  const horizontalPaddingRem = maxColumns > 1 ? GESTURE_MENU_PANEL_PADDING_MD_REM : GESTURE_MENU_PANEL_PADDING_REM

  // Row/header/padding heights, used to work out how many rows fit in a column.
  // Vertical padding matches what GestureMenu.tsx renders: the larger single-column value (2.25rem) only
  // in mobile portrait, the smaller landscape value (1.7rem) everywhere above the md breakpoint —
  // including when a landscape layout collapses to a single column. Budgeting the value the panel
  // actually renders (rather than always assuming the larger one) reclaims ~ 0.5 row of height in
  // landscape, i.e. roughly one more command per column.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const rowGapPx = GESTURE_MENU_ROW_GAP_REM * remPx
  const headerPx = GESTURE_MENU_HEADER_HEIGHT_REM * remPx
  const verticalPaddingPx =
    2 * (isMobilePortrait ? GESTURE_MENU_PANEL_PADDING_REM : GESTURE_MENU_PANEL_PADDING_VERTICAL_MD_REM) * remPx

  // Extra height for the selected command's expanded description so it never crops the column bottom
  // (the multi-column menu doesn't scroll). One command is selected whenever a gesture is in progress.
  const selectedRowPx = GESTURE_MENU_SELECTED_ROW_REM * remPx
  const gridHeightPx = availableHeightPx - headerPx - verticalPaddingPx - selectedRowPx

  /**
   * How many command rows fit in `heightPx` of column height. N stacked rows span N·pitch − rowGap (the
   * last row has no trailing gap), so we add one rowGap back before flooring — otherwise the count is
   * short by up to a full row and a column gives away capacity it actually has.
   */
  const findNumOfRowsFittingIn = (heightPx: number) => Math.max(1, Math.floor((heightPx + rowGapPx) / rowPitchPx))

  // One capacity for every row, because every command is the same kind of row. Nothing is reserved at
  // the bottom of a column: Cancel and Command Universe are ordinary items at the end of the list, so
  // when the list overflows they are trimmed like any other command rather than displacing one.
  const rowsPerColumn = findNumOfRowsFittingIn(gridHeightPx)

  // Packed layout: fill each column to the top before starting the next, and open only as many columns
  // as the commands need (not as many as the viewport could fit), bounded by what the width allows. At
  // one column this is identical to the single-column mobile layout.
  const columnCount = Math.min(maxColumns, Math.max(1, Math.ceil(commandCount / rowsPerColumn)))

  // Trim to what the open columns can actually hold, so the grid never crops a partially drawn row.
  const visibleCommandCount = Math.min(commandCount, columnCount * rowsPerColumn)

  return {
    columnCount,
    maxColumns,
    horizontalPaddingRem,
    rowsPerColumn,
    visibleCommandCount,
    isMobilePortrait,
    isMultiColumn: columnCount > 1,
  }
}

export default useGestureMenuLayout
