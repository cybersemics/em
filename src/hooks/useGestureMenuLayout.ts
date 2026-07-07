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

/** Gap between columns. Desktop mockup (node 6586:107957) column stride 352px with ~317px content width → ~35px. */
export const GESTURE_MENU_COLUMN_GAP_REM = 1.944

/** Horizontal panel padding above the `md` breakpoint (90px per side in both mockups = 5rem at the 18px default root). */
export const GESTURE_MENU_PANEL_PADDING_MD_REM = 5

/** Horizontal panel padding below `md` (existing single-column value). */
export const GESTURE_MENU_PANEL_PADDING_REM = 2.25

/** Vertical gap between command rows (existing literal). */
export const GESTURE_MENU_ROW_GAP_REM = 1.2

/** Gap between the regular commands and the Cancel/Cheatsheet group (existing literal). */
export const GESTURE_MENU_GROUP_GAP_REM = 2.15

/** Approximate height of the "Gestures" header block (label + divider + bottom margin). */
export const GESTURE_MENU_HEADER_HEIGHT_REM = 2.8

/** Approximate row pitch: command label height (~0.95rem) plus the row gap. */
export const GESTURE_MENU_ROW_PITCH_REM = 0.95 + GESTURE_MENU_ROW_GAP_REM

/** Approximate height of the persistent block: a single full-width bottom row plus the group gap above it. */
export const GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM = GESTURE_MENU_GROUP_GAP_REM + GESTURE_MENU_ROW_PITCH_REM

interface GestureMenuLayout {
  /** Number of columns to render. */
  columnCount: number
  /** Rows per column (capped by available height so trimming has a defined capacity). */
  rowsPerColumn: number
  /** Number of regular commands actually rendered (may be trimmed when they overflow the grid). */
  visibleRegularCount: number
  /** True below the `md` breakpoint — the menu stays single-column and keeps its mobile-portrait behavior. */
  isMobilePortrait: boolean
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

  // Gap-aware column count: N columns plus their N−1 gaps must physically fit,
  // so no column renders below the minimum width. Clamped to at least 1.
  const columnCount = isMobilePortrait ? 1 : Math.max(1, Math.floor((availableWidthPx + gapPx) / (minColumnPx + gapPx)))

  // Row/header/padding geometry shared by both height budgets.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const headerPx = GESTURE_MENU_HEADER_HEIGHT_REM * remPx
  const verticalPaddingPx = 2 * GESTURE_MENU_PANEL_PADDING_REM * remPx
  const persistentBlockPx = GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM * remPx
  const gridHeightPx = availableHeightPx - headerPx - verticalPaddingPx

  // Two height budgets. When persistent commands flow inline there is no separate bottom row, so
  // the full grid height is available (maxRowsInline). When they fall back to the full-width bottom
  // row, that row's height is reserved (maxRowsBottom).
  const maxRowsInline = Math.max(1, Math.floor(gridHeightPx / rowPitchPx))
  const maxRowsBottom = Math.max(1, Math.floor((gridHeightPx - persistentBlockPx) / rowPitchPx))

  // Inline layout: balance main + persistent commands across the columns so every column has a
  // similar height (rather than filling main to ceil(main/cols) and leaving the last column short).
  // The persistent commands are the final items in the flow, so they land at the bottom of the last
  // column. Inline is used only when the tallest column still fits the inline height budget.
  const balancedRows = Math.ceil((regularCount + persistentCount) / columnCount) || 0
  const lastColMain = regularCount - (columnCount - 1) * balancedRows
  const lastColRows = Math.max(lastColMain, 0) + persistentCount
  const persistentInline =
    columnCount > 1 && balancedRows <= maxRowsInline && lastColRows <= maxRowsInline

  // Bottom-row layout: main commands fill the grid (reserved-height budget) and trim from the end
  // when they overflow, since the multi-column menu doesn't scroll.
  const idealRows = Math.ceil(regularCount / columnCount) || 0
  const bottomRows = Math.min(idealRows, maxRowsBottom)
  const bottomCapacity = columnCount * bottomRows
  const bottomFits = regularCount <= bottomCapacity && idealRows <= maxRowsBottom

  const rowsPerColumn = persistentInline ? balancedRows : bottomRows
  const visibleRegularCount = persistentInline ? regularCount : bottomFits ? regularCount : bottomCapacity

  return { columnCount, rowsPerColumn, visibleRegularCount, isMobilePortrait, persistentInline }
}

export default useGestureMenuLayout
