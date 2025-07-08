import { useMemo } from 'react'
import { CONTENT_BOX_PADDING } from '../constants'
import viewportStore from '../stores/viewport'

interface DropHoverLengthProps {
  isTableCol1?: boolean
  isTableCol2?: boolean
}

/** Returns drop hover bar style. */
const useDropHoverLength = (props?: DropHoverLengthProps) => {
  const { contentWidth } = viewportStore.getState()
  // TODO: Need to check about the use of isTableCol1 for 50vw property
  const isTableCol1 = props?.isTableCol1
  const isTableCol2 = props?.isTableCol2

  return useMemo(
    () => (isTableCol1 || isTableCol2 ? '50vw' : `${contentWidth - CONTENT_BOX_PADDING}px`),
    [contentWidth, isTableCol1, isTableCol2],
  )
}

export default useDropHoverLength
