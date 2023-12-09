import { useSelector } from 'react-redux'
import themeColors from '../selectors/themeColors'

/** Returns the color of the drop-hover element.
 * Drop hover color alternates as depth increases.
 * Default highlight color is used at the level of the draggingThought.
 * */
const useDropHoverColor = (depth: number) =>
  useSelector(state => {
    const colors = themeColors(state)
    return ((state.draggingThought || []).length - depth) % 2 ? colors.highlight2 : colors.highlight
  })

export default useDropHoverColor
