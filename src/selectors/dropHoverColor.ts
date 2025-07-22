import { token } from '../../styled-system/tokens'
import State from '../@types/State'

/** Returns the color of the drop-hover element.
 * Drop hover color alternates as depth increases.
 * Default highlight color is used at the level of the draggingThoughts.
 */
const dropHoverColor = (state: State, depth: number) =>
  ((state.draggingThoughts || []).length - depth) % 2 ? token('colors.highlight2') : token('colors.highlight')

export default dropHoverColor
