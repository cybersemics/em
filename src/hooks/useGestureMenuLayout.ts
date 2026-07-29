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
 * Height a full-width persistent bottom row reserves: the group gap above it plus one item row (the two
 * persistent items sit side by side, so the row is one item tall regardless of count). Subtracted from
 * the column height (`maxRowsBottom`) in the overflow layout so the row never overlaps or crops a column.
 * `+ 1` is the item's own line height (one row pitch minus its trailing row gap).
 */
export const GESTURE_MENU_PERSISTENT_BOTTOM_ROW_REM = GESTURE_MENU_GROUP_GAP_REM + 1

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
   * True when the persistent commands (Cancel/Command Universe) flow inline at the bottom of a
   * column (their own spare column, or the last main column). True only when every main command fits
   * AND a column has room for the block. False when main commands overflow — the block then renders as
   * a full-width bottom row so every column row can hold a main command — and in the single-column
   * path, which lays out persistent commands itself.
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
  // Vertical padding matches what GestureMenu.tsx renders: the larger single-column value (2.25rem) only
  // in mobile portrait, the smaller landscape value (1.7rem) everywhere above the md breakpoint —
  // including when a landscape layout collapses to a single column. Budgeting the value the panel
  // actually renders (rather than always assuming the larger one) reclaims ~ 0.5 row of height in landscape,
  // which is what lets the persistent block squeeze under a full first column instead of needing a spare
  // one.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const rowGapPx = GESTURE_MENU_ROW_GAP_REM * remPx
  const itemHeightPx = (GESTURE_MENU_ROW_PITCH_REM - GESTURE_MENU_ROW_GAP_REM) * remPx
  const groupGapPx = GESTURE_MENU_GROUP_GAP_REM * remPx
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
   * short by up to a full row, which spills the persistent block into a spare column a row too soon.
   * Inverse of {@link calcColCommandsHeightInPx}.
   */
  const findNumOfRowsFittingIn = (heightPx: number) => Math.max(1, Math.floor((heightPx + rowGapPx) / rowPitchPx))

  /** Pixel height of a vertical stack of `rows` command rows (N rows have N−1 row gaps between them). */
  const calcColCommandsHeightInPx = (rows: number) => (rows <= 0 ? 0 : rows * itemHeightPx + (rows - 1) * rowGapPx)

  // Max rows per column when the persistent block flows inline inside a column (no reserved row below),
  // so the whole grid height is free for rows.
  const maxRowsInline = findNumOfRowsFittingIn(gridHeightPx)

  // Max rows per column when a full-width persistent row is reserved at the bottom (the overflow layout).
  // The reserved row eats ≈1 row of height off every column, but frees the last column's bottom rows for
  // main commands — see the overflow branch below.
  const persistentBottomRowPx = persistentCommandsCount > 0 ? GESTURE_MENU_PERSISTENT_BOTTOM_ROW_REM * remPx : 0
  const maxRowsBottom = findNumOfRowsFittingIn(gridHeightPx - persistentBottomRowPx)

  // Packed layout: fill each column to the top before starting the next, and open only as many columns
  // as the commands need (not as many as the viewport could fit). At one column this is identical to
  // the single-column mobile layout.
  const mainColumnsNeeded = mainCommandsCount === 0 ? 0 : Math.ceil(mainCommandsCount / maxRowsInline)
  // How many main commands land in that last main column (the rest fill earlier columns completely).
  const mainInLastMainCol = mainColumnsNeeded === 0 ? 0 : mainCommandsCount - (mainColumnsNeeded - 1) * maxRowsInline
  // Whether the persistent block fits under the last main column, checked in pixels rather than rounded
  // row counts: the block is a group gap plus its own stacked rows (much shorter than the whole-row
  // rounding it used to cost), and the column also carries the selected command's reserved expansion.
  // The tallest column decides the fit; a full earlier column always fits by construction (that is how
  // maxRowsInline is derived), so only the last column — the one carrying the persistent block — needs
  // this check.
  const persistentBlockPx =
    persistentCommandsCount > 0 ? groupGapPx + calcColCommandsHeightInPx(persistentCommandsCount) : 0
  const lastColumnHeightPx = calcColCommandsHeightInPx(mainInLastMainCol) + selectedRowPx + persistentBlockPx
  const fitsUnderLastMainColumn =
    mainCommandsCount > 0 && headerPx + verticalPaddingPx + lastColumnHeightPx <= availableHeightPx
  const spareColumnAvailable = mainColumnsNeeded < maxColumns && persistentCommandsCount <= maxRowsInline
  // Inline placement is possible only if all main commands fit without trimming AND the persistent
  // block has somewhere to go (under the last column, or in a spare one).
  const persistentInlineFits = mainColumnsNeeded <= maxColumns && (fitsUnderLastMainColumn || spareColumnAvailable)

  let columnCount: number
  let rowsPerColumn: number
  let visibleRegularCount: number
  let persistentColumnIndex: number
  let persistentInline: boolean

  // The persistent block (Cancel / Command Universe) is never split. Place it inline only when every
  // main command already fits and a column has slack for it:
  //   1. under the last main column, if the leftover space there fits it;
  //   2. otherwise a spare empty column, if maxColumns leaves room (this is the case where a full
  //      first column + empty second column used to wrongly get pushed to the bottom row).
  // Otherwise — when main commands overflow — the block drops to a full-width bottom row so every
  // column row goes to a main command (see the overflow branch).
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
    // Overflow (or the persistent block has no inline slack): give every visible column row to a MAIN
    // command and drop the persistent block to a compact full-width row at the bottom. The two
    // persistent items share one horizontal row (`maxRowsBottom` reserves ≈1 row of height off the
    // columns), which costs fewer main commands than a vertical inline block — that block would reserve
    // the last column's bottom rows (items + group gap ≈ 3 rows in one column). So when main commands
    // overflow, the bottom row shows MORE of them, and the leftover column rows go to commands rather
    // than sitting empty (#4313).
    columnCount = Math.min(maxColumns, Math.max(1, Math.ceil(mainCommandsCount / maxRowsBottom)))
    rowsPerColumn = maxRowsBottom
    visibleRegularCount = Math.min(mainCommandsCount, columnCount * maxRowsBottom)
    persistentColumnIndex = 0
    // The persistent block renders as the full-width bottom row (never inline) in this layout.
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
