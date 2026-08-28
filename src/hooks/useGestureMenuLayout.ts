import { useSelector } from 'react-redux'
import { token } from '../../styled-system/tokens'
import { isBrowser, isTablet } from '../browser'
import viewportStore from '../stores/viewport'

/**************************************************************
 * Width capacity
 **************************************************************/
/** Smallest usable column width in rem. */
export const MIN_COLUMN_WIDTH_REM = 15.5

/** Horizontal space between columns. Also rendered by GestureMenu. */
export const COLUMN_GAP_REM = 2

/** Panel inset used when only one column fits. */
export const SINGLE_COLUMN_INLINE_PADDING_REM = 2.25

/** Panel inset used when multi columns fit with wide gutters. */
export const MULTI_COLUMN_INLINE_PADDING_REM = 5

/**************************************************************
 * Height capacity
 **************************************************************/

/** Reachable vertical portion of a tablet viewport. */
export const TABLET_AVAILABLE_HEIGHT_RATIO = 0.44

/** Vertical panel inset when only one column fits. */
export const SINGLE_COLUMN_BLOCK_PADDING_REM = 2.25

/** Vertical panel inset when multi columns fit. */
export const MULTI_COLUMN_BLOCK_PADDING_REM = 1.7

/** Top inset when a single column Capacitor viewport runs under the status bar. */
export const CAPACITOR_TOP_PADDING_REM = 0.75

/** Vertical gap between each GestureMenuItem. */
export const ROW_GAP_REM = 1.2

/** Approximate row height of regular GestureMenuItem: the icon/label height (1rem) plus the row gap. */
export const APPROXIMATE_ROW_HEIGHT_REM = 1 + ROW_GAP_REM

/**************************************************************
 * Rendered header measurements
 *
 * These are exported because GestureMenu renders the same dimensions
 * that the row-capacity calculation budgets.
 **************************************************************/

/** Font size of the Gesture Menu's header title in rem. */
export const HEADER_FONT_SIZE_REM = 0.9

/** Space between the header title and the divider in rem. */
export const HEADER_TITLE_MARGIN_BOTTOM_REM = 0.444

/** Gesture Menu header divider height in rem. */
export const HEADER_DIVIDER_HEIGHT_REM = 0.056
/** Space between the header block and the content below it in rem. */
export const HEADER_BLOCK_MARGIN_BOTTOM_REM = 1.389

/** Estimated height of the header block. */
export const ESTIMATED_HEADER_HEIGHT_REM =
  HEADER_FONT_SIZE_REM + HEADER_TITLE_MARGIN_BOTTOM_REM + HEADER_DIVIDER_HEIGHT_REM + HEADER_BLOCK_MARGIN_BOTTOM_REM

/**************************************************************
 * Gesture Menu item measurements
 *
 * These are exported so the row-capacity calculation can use
 * the same dimensions that GestureMenuItem uses when rendering.
 **************************************************************/

/** Extra top padding for a selected GestureMenuItem. */
export const SELECTED_ITEM_PADDING_TOP_REM = 0.6

/** Gap between the selected item label and its description. */
export const SELECTED_ITEM_GAP_REM = 0.5

/** Line height of the selected item description. */
export const SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM = 1.1

/** Extra bottom padding for a selected GestureMenuItem. */
export const SELECTED_ITEM_PADDING_BOTTOM_REM = 0.1

/**
 * Approximate maximum number of description rows displayed.
 *
 * Some items, such as Context View, have longer descriptions. However,
 * since this command requires two steps (`ru`), there are usually
 * few possible commands remaining, so they are rendered
 * in a single column and the exact height is less important here.
 */

const SELECTED_ITEM_DESCRIPTION_MAX_LINES = 2

/**
 * Estimated extra height for a selected Gesture Menu item, which displays
 * a description and additional spacing. */
export const ESTIMATED_SELECTED_ITEM_EXTRA_HEIGHT_REM =
  SELECTED_ITEM_PADDING_TOP_REM +
  SELECTED_ITEM_GAP_REM +
  SELECTED_ITEM_DESCRIPTION_MAX_LINES * SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM +
  SELECTED_ITEM_PADDING_BOTTOM_REM

/**
 * Calculates how many columns of at least `minColumnWidthPx` can fit within the
 * viewport after accounting for horizontal padding and gaps between columns.
 *
 * The gap is added back to the available width because the last column does not
 * have a trailing gap.
 */
const columnsFittingAtPadding = ({
  paddingRem,
  viewportWidth,
  remInPx,
  columnGapPx,
  minColumnWidthPx,
}: {
  viewportWidth: number
  paddingRem: number
  remInPx: number
  columnGapPx: number
  minColumnWidthPx: number
}) =>
  Math.max(1, Math.floor((viewportWidth - 2 * paddingRem * remInPx + columnGapPx) / (minColumnWidthPx + columnGapPx)))

/**
 * How many command rows fit in a column height.
 * Each row has a gap below it except the last, so add one `rowGapPx` back
 * before flooring to avoid returning fewer rows than should fit.
 *
 * Always returns at least 1 row.
 */
const findNumOfRowsFittingIn = ({
  listHeightPx,
  rowGapPx,
  rowHeightPx,
}: {
  listHeightPx: number
  rowGapPx: number
  rowHeightPx: number
}) => Math.max(1, Math.floor((listHeightPx + rowGapPx) / rowHeightPx))

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
   * Width of a single column.
   */
  columnWidth: string
  /** Divider width under the "Gestures" header. It always spans exactly one column. Below `md` there is only ever one column and it fills the panel, so this collapses
   * to 100%. */
  dividerWidth: string
  /**
   * Horizontal panel padding per side, in rem.
   */
  horizontalPaddingRem: number
  /**
   * Top panel padding, in rem.
   */
  paddingTopRem: number
  /**
   * Vertical panel padding per side, in rem.
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
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)

  const isMobilePortrait = innerWidth < parseInt(token('breakpoints.md'))

  // Determine available height to render GestureMenu content (header + list).
  // On tablet, the command list is held to the safe zone rather than the whole screen: the hand holding the
  // device covers the bottom, so a long list is wrapped into the next column and the remainder trimmed.
  // Everywhere else this is the full viewport, leaving every phone and desktop budget unchanged.
  const availableHeightPx = isTablet ? innerHeight * TABLET_AVAILABLE_HEIGHT_RATIO : innerHeight

  // Get the rem basis to convert rem-based measurements to pixels.
  const remPx = useSelector(state => state.fontSize)

  // convert rem-based measurements to px for layout calculations.
  const minColumnWidthPx = MIN_COLUMN_WIDTH_REM * remPx
  const columnGapPx = COLUMN_GAP_REM * remPx
  const rowGapPx = ROW_GAP_REM * remPx
  const headerPx = ESTIMATED_HEADER_HEIGHT_REM * remPx
  const approxRowHeightPx = APPROXIMATE_ROW_HEIGHT_REM * remPx

  // At this stage, compute how many columns can fit at each padding level.
  // If it render in tablet and more columns can fit with narrower padding, prefer the narrower inset.
  // This is useful on smaller tablets like the iPad mini, allowing more commands
  // to fit while still avoiding rendering the list in the hand-grip area.
  const columnsAtWidePadding = columnsFittingAtPadding({
    paddingRem: MULTI_COLUMN_INLINE_PADDING_REM,
    viewportWidth: innerWidth,
    remInPx: remPx,
    columnGapPx,
    minColumnWidthPx,
  })
  const columnsAtNarrowPadding = columnsFittingAtPadding({
    paddingRem: SINGLE_COLUMN_INLINE_PADDING_REM,
    viewportWidth: innerWidth,
    remInPx: remPx,
    columnGapPx,
    minColumnWidthPx,
  })

  const useNarrowMultiColumn = isTablet && columnsAtWidePadding === 1 && columnsAtNarrowPadding > 1

  // List will be always single-column in mobile portrait,
  // Otherwise, use `useNarrowMultiColumn` to determine whether to use the maximum
  // num of columns that fit with narrow or wide padding.
  const maxColumns = isMobilePortrait ? 1 : useNarrowMultiColumn ? columnsAtNarrowPadding : columnsAtWidePadding

  const fitsMultiColumn = maxColumns > 1

  // Determine which inset values to use based on the column layout.
  const horizontalPaddingRem =
    fitsMultiColumn && !useNarrowMultiColumn ? MULTI_COLUMN_INLINE_PADDING_REM : SINGLE_COLUMN_INLINE_PADDING_REM
  const verticalPaddingRem = fitsMultiColumn ? MULTI_COLUMN_BLOCK_PADDING_REM : SINGLE_COLUMN_BLOCK_PADDING_REM

  const verticalPaddingPx = 2 * verticalPaddingRem * remPx

  // Specific in Capacitor and single-column layout, we may need to adjust the top padding
  // so we can to be match with the design
  const paddingTopRem = !fitsMultiColumn && !isBrowser ? CAPACITOR_TOP_PADDING_REM : verticalPaddingRem

  // Compute actual column width and divider width based on the number of columns that can fit in the viewport.
  const columnWidth = `calc((100% - ${(maxColumns - 1) * COLUMN_GAP_REM}rem) / ${maxColumns})`
  const dividerWidth = isMobilePortrait ? '100%' : columnWidth

  // Extra height (in px) for selected GestureMenuItem to budget for the description.
  const selectedRowExtraHeightPx = ESTIMATED_SELECTED_ITEM_EXTRA_HEIGHT_REM * remPx

  // Find the remaining height (in px) available to render the list,
  // after subtracting space for header, padding, and selected row extra height.
  const availableListHeightPx = availableHeightPx - headerPx - verticalPaddingPx - selectedRowExtraHeightPx

  // Get num of rows can fit depending for `availableListHeightPx`
  const rowsPerColumn = findNumOfRowsFittingIn({
    listHeightPx: availableListHeightPx,
    rowGapPx,
    rowHeightPx: approxRowHeightPx,
  })

  // Find how many columns are currently needed to fit the commands, capped at maxColumns.
  // In multi-column, commands are filled top-to-bottom, left-to-right to keep the layout compact.
  const columnCount = Math.min(maxColumns, Math.max(1, Math.ceil(commandCount / rowsPerColumn)))

  // Cap the command count to the number of commands that can be displayed given the column and row constraints.
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
