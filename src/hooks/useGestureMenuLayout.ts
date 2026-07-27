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

  // Row/header/padding geometry shared by both height budgets. Padding is picked off maxColumns (the
  // width ceiling), not the packed columnCount — the multi-column budget only feeds trimming, which
  // only runs when the layout is actually multi-column; a packed collapse to one column renders via
  // the (scrolling, non-trimming) single-column path where the budget is unused.
  const rowPitchPx = GESTURE_MENU_ROW_PITCH_REM * remPx
  const headerPx = GESTURE_MENU_HEADER_HEIGHT_REM * remPx
  const verticalPaddingRem =
    maxColumns > 1 ? GESTURE_MENU_PANEL_PADDING_VERTICAL_MD_REM : GESTURE_MENU_PANEL_PADDING_REM
  const verticalPaddingPx = 2 * verticalPaddingRem * remPx
  const persistentBlockPx = GESTURE_MENU_PERSISTENT_BLOCK_HEIGHT_REM * remPx
  const gridHeightPx = availableHeightPx - headerPx - verticalPaddingPx

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

  // Inline layout: persistent commands stack at the bottom of the last column that actually holds
  // main commands (never a lone empty column), so they count toward the column need. mainColumnsUsed
  // is how many columns the main commands alone fill; the persistent block attaches to the last of
  // those. Inline is used only when more than one column is genuinely needed AND that attach column
  // still fits the inline budget — otherwise persistent falls back to the bottom row. When the packed
  // layout collapses to a single column, the component's single-column path renders persistent
  // instead (isMultiColumn === false), so inline is scoped to inlineColumns > 1.
  const inlineColumns = Math.min(maxColumns, Math.max(1, Math.ceil((regularCount + persistentCount) / maxRowsInline)))
  const mainColumnsUsed = regularCount === 0 ? 0 : Math.min(inlineColumns, Math.ceil(regularCount / maxRowsInline))
  const persistentColumnIndex = Math.max(mainColumnsUsed - 1, 0)
  const mainInLastMainCol = regularCount === 0 ? 0 : regularCount - Math.max(mainColumnsUsed - 1, 0) * maxRowsInline
  const attachColRows = mainInLastMainCol + persistentCount
  const persistentInline = inlineColumns > 1 && attachColRows <= maxRowsInline

  // Bottom-row layout: only main commands fill the grid (persistent take a reserved full-width row),
  // packed into as few columns as needed and capped by maxColumns; main trims from the end when it
  // overflows the grid capacity, since the multi-column menu doesn't scroll.
  const bottomColumns = Math.min(maxColumns, Math.max(1, Math.ceil(regularCount / maxRowsBottom)))
  const bottomCapacity = bottomColumns * maxRowsBottom
  const bottomFits = regularCount <= bottomCapacity

  // Rows per column is the fixed capacity (not a balanced average), so column 0 fills first and the
  // last column drains.
  const columnCount = persistentInline ? inlineColumns : bottomColumns
  const rowsPerColumn = persistentInline ? maxRowsInline : maxRowsBottom
  const visibleRegularCount = persistentInline ? regularCount : bottomFits ? regularCount : bottomCapacity

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
