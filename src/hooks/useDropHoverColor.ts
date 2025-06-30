import { useSelector } from 'react-redux'
import { token } from '../../styled-system/tokens'

/** Returns the color of the drop-hover element.
 * Drop hover color alternates as depth increases.
 * Default highlight color is used at the level of the draggingThoughts.
 * */
const useDropHoverColor = (depth: number) =>
  useSelector(state => {
    return ((state.draggingThoughts || []).length - depth) % 2 ? token('colors.highlight2') : token('colors.highlight')
  })

export default useDropHoverColor
