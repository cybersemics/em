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
 * The single-column panel padding (existing value). Used for BOTH the horizontal padding below `md`
 * AND the vertical padding in single-column mode (see GestureMenu.tsx `horizontalPadding` /
 * `verticalPadding`). Multi-column uses `_MD_REM` horizontally and `_VERTICAL_MD_REM` vertically.
 */
export const GESTURE_MENU_PANEL_PADDING_REM = 2.25

/** Vertical panel padding above the `md` breakpoint (multi-column). */
export const GESTURE_MENU_PANEL_PADDING_VERTICAL_MD_REM = 1.7

/** Vertical gap between command rows (existing literal). */
export const GESTURE_MENU_ROW_GAP_REM = 1.2

/** Gap between the regular commands and the Cancel/Cheatsheet group (existing literal). */
export const GESTURE_MENU_GROUP_GAP_REM = 2.15

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

/** Approximate height of the persistent block: a single full-width bottom row plus the group gap above it. */
export const GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM = GESTURE_MENU_GROUP_GAP_REM + GESTURE_MENU_ROW_PITCH_REM

type GestureMenuLayoutProps = {
  /** Number of columns to render. */
  columnCount: number
  /** Rows per column (capped by available height so trimming has a defined capacity). */
  rowsPerColumn: number
  /** Number of regular commands actually rendered (may be trimmed when they overflow the grid). */
  visibleRegularCount: number
  /** Column the inline persistent block attaches to: the last column holding main commands (0 if none). Only meaningful when `persistentInline`. */
  persistentColumnIndex: number
  /** True below the `md` breakpoint — the menu stays single-column and keeps its mobile-portrait behavior. */
  isMobilePortrait: boolean
  /** True when the menu renders more than one column (`columnCount > 1`). */
  isMultiColumn: boolean
  /**
   * True when the persistent commands (Cancel/Command Universe) flow inline under the last column
   * instead of a full-width row below. Requires untrimmed main commands AND both persistent commands
   * fitting together under the last column; else they fall back to the bottom row.
   */
  persistentInline: boolean
}

/**
 * Compute the multi-column Gesture Menu layout: column count, rows per column,
 * visible commands after trimming, and persistent-block placement. Reactively reads
 * viewport dimensions (`viewportStore`) and the rem basis (`state.fontSize`).
 */
const useGestureMenuLayout = (
  /** Number of main (non-persistent) commands. */
  mainCommandsCount: number,
  /** Number of persistent commands (Cancel/Command Universe). */
  persistentCommandsCount: number,
): GestureMenuLayoutProps => {
  const remPx = useSelector(state => state.fontSize)
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)

  const isMobilePortrait = innerWidth < GESTURE_MENU_MD_BREAKPOINT_PX

  // Panel inner width: viewport minus the panel's horizontal padding (5rem above md, 2.25rem below).
  const horizontalPaddingRem = isMobilePortrait ? GESTURE_MENU_PANEL_PADDING_REM : GESTURE_MENU_PANEL_PADDING_MD_REM
  const availableWidthPx = innerWidth - 2 * horizontalPaddingRem * remPx
  const availableHeightPx = innerHeight

  const minColumnPx = GESTURE_MENU_MIN_COLUMN_WIDTH_REM * remPx
  const gapPx = GESTURE_MENU_COLUMN_GAP_REM * remPx

  // How many columns physically fit across the width. N columns need N widths + (N−1) gaps, so we
  // solve for the largest N that fits and floor at 1. This is only an upper limit — the packed layout
  // below may use fewer, however many the commands actually need.
  const maxColumns = isMobilePortrait ? 1 : Math.max(1, Math.floor((availableWidthPx + gapPx) / (minColumnPx + gapPx)))

  // Row/header/padding heights, used to work out how many rows fit in a column.
  // For the vertical budget we use PANEL_PADDING_REM (2.25rem), which is what single-column mode
  // actually renders as its vertical padding (GestureMenu.tsx `verticalPadding`). Multi-column renders
  // a smaller vertical padding (VERTICAL_MD_REM, 1.7rem), but we deliberately budget with the LARGER
  // single-column value: a packed layout can collapse down to the single-column path, and had we
  // budgeted for the smaller padding, that path would crop. The cost is that multi-column (which has
  // more room) under-fills a column by at most a fraction of a row — a harmless gap, never a crop.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const headerPx = GESTURE_MENU_HEADER_HEIGHT_REM * remPx
  const verticalPaddingPx = 2 * GESTURE_MENU_PANEL_PADDING_REM * remPx
  const persistentBlockPx = GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM * remPx

  // Extra height for the selected command's expanded description so it never crops the column bottom
  // (the multi-column menu doesn't scroll). One command is selected whenever a gesture is in progress.
  const selectedRowPx = GESTURE_MENU_SELECTED_ROW_REM * remPx
  const gridHeightPx = availableHeightPx - headerPx - verticalPaddingPx - selectedRowPx

  // Max rows per column, computed two ways because the persistent block can land in two places:
  //   maxRowsInline — persistent flows inside a column, so the whole grid height is free for rows.
  //   maxRowsBottom — persistent takes a reserved full-width row, so that height is subtracted first.
  // Which one is correct depends on where persistent ends up, but that decision needs these numbers —
  // so we compute both up front, then pick below.
  const maxRowsInline = Math.max(1, Math.floor(gridHeightPx / rowPitchPx))
  const maxRowsBottom = Math.max(1, Math.floor((gridHeightPx - persistentBlockPx) / rowPitchPx))

  // Packed layout: fill each column to the top before starting the next, and open only as many columns
  // as the commands need (not as many as the viewport could fit). At one column this is identical to
  // the single-column mobile layout.
  const mainColumnsNeeded = mainCommandsCount === 0 ? 0 : Math.ceil(mainCommandsCount / maxRowsInline)
  // How many main commands land in that last main column (the rest fill earlier columns completely).
  const mainInLastMainCol = mainColumnsNeeded === 0 ? 0 : mainCommandsCount - (mainColumnsNeeded - 1) * maxRowsInline
  // Placing persistent under main puts a group gap (wider than a normal row gap) between them, which
  // eats one row's worth of the column's integer capacity — so count one extra row for it, but only
  // when there's a persistent block. A block sitting in its own spare column has nothing above it, so
  // it costs no extra row.
  const groupGapRow = persistentCommandsCount > 0 ? 1 : 0
  const fitsUnderLastMainColumn =
    mainCommandsCount > 0 && mainInLastMainCol + persistentCommandsCount + groupGapRow <= maxRowsInline
  const spareColumnAvailable = mainColumnsNeeded < maxColumns && persistentCommandsCount <= maxRowsInline
  // Inline placement is possible only if all main commands fit without trimming AND the persistent
  // block has somewhere to go (under the last column, or in a spare one).
  const persistentInlineFits = mainColumnsNeeded <= maxColumns && (fitsUnderLastMainColumn || spareColumnAvailable)

  let columnCount: number
  let rowsPerColumn: number
  let visibleRegularCount: number
  let persistentColumnIndex: number
  let persistentInline: boolean

  // The persistent block (Cancel / Command Universe) is never split. Place it, in order:
  //   1. under the last main column, if the leftover space there fits it;
  //   2. otherwise a spare empty column, if maxColumns leaves room (this is the case where a full
  //      first column + empty second column used to wrongly get pushed to the bottom row);
  //   3. otherwise the full-width row along the bottom.
  if (persistentInlineFits) {
    // Attach the persistent block under the last main column, or spill it into the spare column.
    persistentColumnIndex = fitsUnderLastMainColumn ? Math.max(mainColumnsNeeded - 1, 0) : mainColumnsNeeded
    columnCount = fitsUnderLastMainColumn ? Math.max(mainColumnsNeeded, 1) : mainColumnsNeeded + 1
    rowsPerColumn = maxRowsInline
    visibleRegularCount = mainCommandsCount
    // A single column uses the component's single-column path, which lays out the persistent commands
    // itself — inline only applies to the multi-column grid.
    persistentInline = columnCount > 1
  } else {
    // Bottom-row layout: main commands fill the grid (persistent take a reserved full-width row),
    // packed into as few columns as needed and capped by maxColumns; main trims from the end on
    // overflow, since the multi-column menu doesn't scroll.
    columnCount = Math.min(maxColumns, Math.max(1, Math.ceil(mainCommandsCount / maxRowsBottom)))
    rowsPerColumn = maxRowsBottom
    visibleRegularCount = Math.min(mainCommandsCount, columnCount * maxRowsBottom)
    persistentColumnIndex = 0
    persistentInline = false
  }

  return {
    columnCount,
    rowsPerColumn,
    visibleRegularCount,
    persistentColumnIndex,
    isMobilePortrait,
    isMultiColumn: columnCount > 1,
    persistentInline,
  }
}

export default useGestureMenuLayout
