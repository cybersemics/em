import { useMemo } from 'react'
import { CONTENT_BOX_PADDING } from '../constants'
import viewportStore from '../stores/viewport'

interface DropHoverLengthProps {
  isTableCol1?: boolean // For dropping into place as a first column in table view
  isTableCol2?: boolean // For dropping into place as a second column in table view
}

/**
 * Just use for dragging-dropping behavior.
 * Returns the width for a drop hover bar based on context.
 *
 * Dependencies:
 * - Requires parent Content component with id="content"
 * - Assumes CONTENT_BOX_PADDING matches Content padding
 * - For table view, assumes 50/50 split of table width.
 *
 * @param props.isTableCol1 - First column in table view (50vw width).
 * @param props.isTableCol2 - Second column in table view (50vw width).
 * @returns CSS width value as string.
 */
const useDropHoverLength = (props?: DropHoverLengthProps) => {
  const { contentWidth } = viewportStore.getState()
  // TODO: Need to check about the use of isTableCol1 for 50vw property
  const isTableCol1 = props?.isTableCol1
  const isTableCol2 = props?.isTableCol2

  if (contentWidth < 0) {
    console.error('Invalid content width')
    return '100%' // Safe fallback
  }

  return useMemo(
    () =>
      isTableCol1 || isTableCol2
        ? '50vw' // Table view mode: 50% of table width
        : `${contentWidth - CONTENT_BOX_PADDING}px`, // Normal mode: Content width minus padding
    [contentWidth, isTableCol1, isTableCol2],
  )
}

export default useDropHoverLength
