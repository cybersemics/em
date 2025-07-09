import { useSelector } from 'react-redux'
import { hasChildren } from '../selectors/getChildren'
import head from '../util/head'

/**
 * A hook that calculates the visual indentation depth of the current cursor position.
 * This is used for:
 * 1. Layout calculations in LayoutTree to determine horizontal positioning
 * 2. Multiline detection in Editable component.
 *
 * @returns The calculated indent depth, used for visual layout and animations.
 */
const useIndentDepth = (): number => {
  return useSelector(state =>
    state.cursor && state.cursor.length > 2
      ? // when the cursor is on a leaf, the indention level should not change
        state.cursor.length - (hasChildren(state, head(state.cursor)) ? 2 : 3)
      : 0,
  )
}

export default useIndentDepth
