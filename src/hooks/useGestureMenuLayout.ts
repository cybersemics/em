import { useSelector } from 'react-redux'
import { token } from '../../styled-system/tokens'
import { isBrowser, isTablet } from '../browser'
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

/** Minimum column width. The Figma frames measure 280px, which is 15.556rem at the 18px default root. */
export const GESTURE_MENU_MIN_COLUMN_WIDTH_REM = 15.5

/** Gap between columns. */
export const GESTURE_MENU_COLUMN_GAP_REM = 2

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

/**
 * Top panel padding under Capacitor, where the viewport extends under the status bar (2026-06-03, to
 * match the iPhone Figma frame). Only applies where a single column is all that fits — the wide layouts
 * have their own vertical rhythm.
 */
export const GESTURE_MENU_PANEL_PADDING_TOP_CAPACITOR_REM = 0.75

/**
 * Fraction of the viewport height a tablet's command list may occupy, measured from the top of the
 * viewport — so the header, the panel's vertical padding and the selected row's expanded description
 * all come out of it. Below this band the hand holding the device covers the list, so the column wraps
 * into the next one and any remainder is trimmed.
 *
 * Measured off the 12.9" iPad frames in Figma (node 12294-186180), which annotate the same device
 * twice: 450 ÷ 1024 in landscape and 600 ÷ 1366 in portrait, i.e. 0.4395 and 0.4392. Agreeing to 0.1%
 * is what lets one ratio replace a per-device table.
 */
export const GESTURE_MENU_TABLET_SAFE_HEIGHT_RATIO = 0.44

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
   * Width of a single column, as a CSS length resolved against the panel's padded content box. Derived
   * from `maxColumns` rather than `columnCount` so a column keeps its width as the gesture narrows the
   * command list: `r` may fill two columns and `rdl` only one, but a column is the same width in both.
   */
  columnWidth: string
  /** Width of the rule under the "Gestures" header. It always spans exactly one column. Below `md` there is only ever one column and it fills the panel, so this collapses
   * to 100%. */
  dividerWidth: string
  /**
   * Horizontal panel padding per side, in rem. Returned (rather than re-derived in the component) so
   * the rendered padding is always the one this hook budgeted against.
   */
  horizontalPaddingRem: number
  /**
   * Top panel padding, in rem. Usually `verticalPaddingRem`, but tighter under Capacitor where the
   * viewport extends under the status bar. Keyed on `maxColumns` like the other two, never on
   * `columnCount`.
   */
  paddingTopRem: number
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

  // On a tablet the list is held to the safe zone rather than the whole screen: the hand holding the
  // device covers the bottom, so a long list is wrapped into the next column and the remainder trimmed.
  // Everywhere else this is the full viewport, leaving every phone and desktop budget unchanged.
  const availableHeightPx = isTablet ? innerHeight * GESTURE_MENU_TABLET_SAFE_HEIGHT_RATIO : innerHeight

  const minColumnPx = GESTURE_MENU_MIN_COLUMN_WIDTH_REM * remPx
  const gapPx = GESTURE_MENU_COLUMN_GAP_REM * remPx

  /**
   * How many minimum-width columns fit across the viewport at a given horizontal panel padding. N
   * columns need N widths + (N−1) gaps, so one gap is added back before dividing and a column is only
   * counted when it *and* its leading gap still fit.
   */
  const columnsFittingAtPadding = (paddingRem: number) =>
    Math.max(1, Math.floor((innerWidth - 2 * paddingRem * remPx + gapPx) / (minColumnPx + gapPx)))

  // Measured against the multi-column padding. This is only an upper limit; we might render fewer
  // columns depending on how many the commands actually needed
  const columnsAtWidePadding = columnsFittingAtPadding(GESTURE_MENU_PANEL_PADDING_HORIZONTAL_MULTI_COLUMN_FIT_REM)

  // A tablet the wide gutters hold to a single column gets the budget retried at the narrow ones. On an
  // iPad mini in portrait the 5rem gutters leave 564px where two minimum columns need 594px, while the
  // narrow padding leaves 663px and two 313.5px columns fit — it is the padding refusing the column, not
  // the screen. Keyed strictly on the *wide* result, which is computed first and never reads
  // `columnCount`, so no viewport that already holds two columns changes and the padding ↔ column-count
  // circularity the wide-padding rule exists to avoid is still avoided.
  const retryAtNarrowPadding =
    isTablet &&
    columnsAtWidePadding === 1 &&
    columnsFittingAtPadding(GESTURE_MENU_PANEL_PADDING_HORIZONTAL_SINGLE_COLUMN_FIT_REM) > 1

  const maxColumns = isMobilePortrait
    ? 1
    : retryAtNarrowPadding
      ? columnsFittingAtPadding(GESTURE_MENU_PANEL_PADDING_HORIZONTAL_SINGLE_COLUMN_FIT_REM)
      : columnsAtWidePadding

  // Both paddings key on `maxColumns` — how many columns *fit* — never on `columnCount`, so a gesture
  // that narrows the list drops columns without shifting the panel. Wherever the viewport could hold
  // more than one column the panel takes the wider gutters horizontally and the *tighter* 1.7rem
  // vertically; the latter is what reclaims ~0.5 row of column height on short and landscape viewports.
  // Both are returned, so the component renders exactly what the budget below is computed against.
  const fitsMultiColumn = maxColumns > 1
  // The panel must render the padding the width budget was measured against: a retried tablet counted
  // its columns at the narrow gutters, so rendering the wide ones would not fit the columns it opened.
  const horizontalPaddingRem =
    fitsMultiColumn && !retryAtNarrowPadding
      ? GESTURE_MENU_PANEL_PADDING_HORIZONTAL_MULTI_COLUMN_FIT_REM
      : GESTURE_MENU_PANEL_PADDING_HORIZONTAL_SINGLE_COLUMN_FIT_REM
  const verticalPaddingRem = fitsMultiColumn
    ? GESTURE_MENU_PANEL_PADDING_VERTICAL_MULTI_COLUMN_FIT_REM
    : GESTURE_MENU_PANEL_PADDING_VERTICAL_SINGLE_COLUMN_FIT_REM

  // Under Capacitor the viewport runs under the status bar, so a single-column panel takes a tighter
  // top padding. Keyed on `maxColumns` — how many columns *fit* — for the same reason as the two
  // paddings above: refining a gesture drops columns, and the panel must not move when it does. Keying
  // this on the column count actually in use made the header jump ~0.95rem the moment a tablet's list
  // narrowed from two columns to one.
  const paddingTopRem =
    !fitsMultiColumn && !isBrowser ? GESTURE_MENU_PANEL_PADDING_TOP_CAPACITOR_REM : verticalPaddingRem

  const columnWidth = `calc((100% - ${(maxColumns - 1) * GESTURE_MENU_COLUMN_GAP_REM}rem) / ${maxColumns})`
  const dividerWidth = isMobilePortrait ? '100%' : columnWidth

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

  // Trim to what the open columns can actually hold, so the grid never crops a partially drawn row.
  const visibleCommandCount = Math.min(commandCount, columnCount * rowsPerColumn)

  return {
    columnCount,
    maxColumns,
    columnWidth,
    dividerWidth,
    horizontalPaddingRem,
    paddingTopRem,
    verticalPaddingRem,
    rowsPerColumn,
    visibleCommandCount,
    isMobilePortrait,
    isMultiColumn: columnCount > 1,
  }
}

export default useGestureMenuLayout
