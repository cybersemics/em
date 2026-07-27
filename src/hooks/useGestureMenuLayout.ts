import { useSelector } from 'react-redux'
import viewportStore from '../stores/viewport'

/**********************************************************************
 * Gesture Menu layout geometry
 *
 * Shared constants and a hook computing the multi-column Gesture Menu
 * layout (issue #4313). Kept in hooks/ (not components/GestureMenu/) to
 * avoid a same-path collision with the in-flight blur branch.
 *
 * Rem values are expressed relative to the 18px default root font size.
 * AppComponent sets `document.documentElement.style.fontSize` from
 * `state.fontSize`, so rem-expressed widths scale with the user's font-size
 * setting. The hook reads `state.fontSize` as the runtime rem basis.
 **********************************************************************/

/** Mobile-portrait breakpoint in px (`md` in panda.config.ts). Below this the menu is single-column. */
export const GESTURE_MENU_MD_BREAKPOINT_PX = 400

/** Minimum column width, 280px ÷ 18 at the default root font size. */
export const GESTURE_MENU_MIN_COLUMN_WIDTH_REM = 15.556

/** Gap between columns. 35px ÷ 18 at the default root font size. */
export const GESTURE_MENU_COLUMN_GAP_REM = 1.944

/** Horizontal panel padding above the `md` breakpoint (90px per side in both mockups = 5rem at the 18px default root). */
export const GESTURE_MENU_PANEL_PADDING_MD_REM = 5

/** Horizontal panel padding below `md` (existing single-column value). */
export const GESTURE_MENU_PANEL_PADDING_REM = 2.25

/** Vertical panel padding above the `md` breakpoint (multi-column). */
export const GESTURE_MENU_PANEL_PADDING_VERTICAL_MD_REM = 1.7

/** Vertical gap between command rows (existing literal). */
export const GESTURE_MENU_ROW_GAP_REM = 1.2

/** Gap between the regular commands and the Cancel/Cheatsheet group (existing literal). */
export const GESTURE_MENU_GROUP_GAP_REM = 2.15

/** Approximate height of the "Gestures" header block (label + divider + bottom margin). */
export const GESTURE_MENU_HEADER_HEIGHT_REM = 2.8

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
 * Extra height one selected command adds over a plain row, reserved from the grid so a selected
 * description never crops the column. Reserving the two-line worst case keeps the menu crop-free at
 * the cost of showing one or two fewer commands when a long description wraps — the reviewer
 * explicitly prefers fewer commands over a clipped menu.
 */
export const GESTURE_MENU_SELECTED_RESERVE_REM =
  GESTURE_MENU_ITEM_SELECTED_PADDING_TOP_REM +
  GESTURE_MENU_ITEM_LABEL_DESCRIPTION_GAP_REM +
  GESTURE_MENU_ITEM_DESCRIPTION_MAX_LINES * GESTURE_MENU_ITEM_DESCRIPTION_LINE_HEIGHT_REM +
  GESTURE_MENU_ITEM_SELECTED_PADDING_BOTTOM_REM

/** Approximate height of the persistent block: a single full-width bottom row plus the group gap above it. */
export const GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM = GESTURE_MENU_GROUP_GAP_REM + GESTURE_MENU_ROW_PITCH_REM

interface GestureMenuLayout {
  /** Number of columns to render. */
  columnCount: number
  /** Rows per column (capped by available height so trimming has a defined capacity). */
  rowsPerColumn: number
  /** Number of regular commands actually rendered (may be trimmed when they overflow the grid). */
  visibleRegularCount: number
  /**
   * Index of the column the inline persistent block attaches to: the last column that actually
   * holds main commands (0 when there are no main commands). Only meaningful when `persistentInline`.
   */
  persistentColumnIndex: number
  /** True below the `md` breakpoint — the menu stays single-column and keeps its mobile-portrait behavior. */
  isMobilePortrait: boolean
  /** True when the menu renders more than one column (`columnCount > 1`). */
  isMultiColumn: boolean
  /**
   * True when the persistent commands (Cancel/Command Universe) flow inline at the bottom of the
   * last column instead of a full-width row below the grid. Only when the regular commands aren't
   * trimmed AND both persistent commands fit together under the last column; otherwise they fall
   * back to the bottom row.
   */
  persistentInline: boolean
}

/**
 * Compute the multi-column Gesture Menu layout: how many columns fit, how many
 * rows per column, how many regular commands are visible after trimming, and
 * whether the last column is empty. Reactively reads the viewport dimensions
 * (`viewportStore`) and the runtime rem basis (`state.fontSize`).
 *
 * @param regularCount Number of regular (non-persistent) commands.
 * @param persistentCount Number of persistent commands (Cancel/Command Universe).
 */
const useGestureMenuLayout = (regularCount: number, persistentCount = 0): GestureMenuLayout => {
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

  // Gap-aware width ceiling: the maximum columns that physically fit — N columns plus their N−1
  // gaps must fit, so no column renders below the minimum width. Clamped to at least 1. This is only
  // the CAP; the packed layout below uses as many columns as the commands actually need, up to this.
  const maxColumns = isMobilePortrait ? 1 : Math.max(1, Math.floor((availableWidthPx + gapPx) / (minColumnPx + gapPx)))

  // Row/header/padding geometry shared by both height budgets. The budget uses the *larger*
  // single-column vertical padding (GESTURE_MENU_PANEL_PADDING_REM), not the tighter multi-column
  // padding: a packed layout can collapse to the single-column path, which renders with this larger
  // padding, so budgeting against it keeps that path from cropping. Multi-column renders with less
  // padding (more room), so this only ever under-fills a column by a fraction of a row — never crops.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const headerPx = GESTURE_MENU_HEADER_HEIGHT_REM * remPx
  const verticalPaddingPx = 2 * GESTURE_MENU_PANEL_PADDING_REM * remPx
  const persistentBlockPx = GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM * remPx
  // Reserve for the one selected command's expanded description so a wrapped description never crops
  // the bottom of a column (the multi-column menu doesn't scroll). One command is selected whenever a
  // gesture is in progress, so the reserve applies to both budgets.
  const selectedReservePx = GESTURE_MENU_SELECTED_RESERVE_REM * remPx
  const gridHeightPx = availableHeightPx - headerPx - verticalPaddingPx - selectedReservePx

  // Two height budgets, i.e. two values of maxRowsPerColumn — they measure different physical heights
  // and cannot collapse to one. When persistent commands flow inline there is no separate bottom row,
  // so the full grid height is available (maxRowsInline). When they fall back to the full-width bottom
  // row, that row's height is reserved (maxRowsBottom). Which one applies depends on persistentInline,
  // which depends on the budget — so compute both, then pick.
  const maxRowsInline = Math.max(1, Math.floor(gridHeightPx / rowPitchPx))
  const maxRowsBottom = Math.max(1, Math.floor((gridHeightPx - persistentBlockPx) / rowPitchPx))

  // Packed layout: fill each column to its row capacity before opening the next, using only as many
  // columns as the commands need — not as many as the viewport fits. The last column drains as
  // commands filter out; once down to one column the menu matches the single-column mobile layout.
  //
  // effectiveColumnCount = ceil(count / rows), CAPPED by maxColumns (what fits the viewport): ceil()
  // alone can ask for e.g. 5 columns on a wide screen when only 3 physically fit — those extra
  // columns would render below the minimum width / overflow. Math.min(maxColumns, …) clamps to the
  // fit; Math.max(1, …) floors at a single column.
  //
  // The inline layout keeps the persistent block (Cancel / Command Universe) whole and stacks it at
  // the bottom of a column whenever it fits; only when there's genuinely no room does it fall to the
  // full-width bottom row. Preference order for the persistent block:
  //   1. under the last main column, if the main tail + persistent still fit the capacity;
  //   2. else in the next (spare) column, if one is available within maxColumns — this is the case a
  //      full first column with an empty second column used to send to the bottom row by mistake;
  //   3. else (all columns full to capacity, or the block itself is taller than a column) the
  //      full-width bottom row.
  const mainColumnsNeeded = regularCount === 0 ? 0 : Math.ceil(regularCount / maxRowsInline)
  const mainInLastMainCol = mainColumnsNeeded === 0 ? 0 : regularCount - (mainColumnsNeeded - 1) * maxRowsInline
  // When the persistent block stacks under main commands it sits below a group gap (GROUP_GAP, wider
  // than a normal row gap), which against the integer row capacity costs one extra row — reserve it
  // (only when there actually is a persistent block). A block in its own spare column has no main
  // above it and no group gap, so no extra row.
  const groupGapReserve = persistentCount > 0 ? 1 : 0
  const fitsUnderLastMainColumn =
    regularCount > 0 && mainInLastMainCol + persistentCount + groupGapReserve <= maxRowsInline
  const spareColumnAvailable = mainColumnsNeeded < maxColumns && persistentCount <= maxRowsInline
  // Inline requires the main commands themselves to fit the columns (no trimming in inline) and a
  // home for the persistent block.
  const persistentInlineFits = mainColumnsNeeded <= maxColumns && (fitsUnderLastMainColumn || spareColumnAvailable)

  let columnCount: number
  let rowsPerColumn: number
  let visibleRegularCount: number
  let persistentColumnIndex: number
  let persistentInline: boolean

  if (persistentInlineFits) {
    // Attach the persistent block under the last main column, or spill it into the spare column.
    persistentColumnIndex = fitsUnderLastMainColumn ? Math.max(mainColumnsNeeded - 1, 0) : mainColumnsNeeded
    columnCount = fitsUnderLastMainColumn ? Math.max(mainColumnsNeeded, 1) : mainColumnsNeeded + 1
    rowsPerColumn = maxRowsInline
    visibleRegularCount = regularCount
    // A single column renders through the component's single-column path, which lays out the
    // persistent commands itself — inline only applies to the multi-column grid.
    persistentInline = columnCount > 1
  } else {
    // Bottom-row layout: only main commands fill the grid (persistent take a reserved full-width
    // row), packed into as few columns as needed and capped by maxColumns; main trims from the end
    // when it overflows the grid capacity, since the multi-column menu doesn't scroll.
    columnCount = Math.min(maxColumns, Math.max(1, Math.ceil(regularCount / maxRowsBottom)))
    rowsPerColumn = maxRowsBottom
    visibleRegularCount = Math.min(regularCount, columnCount * maxRowsBottom)
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
