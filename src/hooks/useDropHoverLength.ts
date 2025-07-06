import { useMemo } from 'react'
import viewportStore from '../stores/viewport'

interface DropHoverLengthProps {
  isTableCol1?: boolean
}

/** Returns drop hover bar style. */
const useDropHoverLength = (props?: DropHoverLengthProps) => {
  const { contentWidth } = viewportStore.getState()
  const isTableCol1 = props?.isTableCol1

  // 60 is the sum of left and right padding of main viewport <div>...</div>.
  return useMemo(() => (isTableCol1 ? '50vw' : `${contentWidth - 60}px`), [contentWidth, isTableCol1])
}

export default useDropHoverLength
