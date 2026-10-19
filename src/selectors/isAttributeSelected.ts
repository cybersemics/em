import MulticursorFilter from '../@types/MulticursorFilter'
import State from '../@types/State'
import headValue from '../util/headValue'
import isAttribute from '../util/isAttribute'
import selectedPaths from './selectedPaths'

/** Returns true if any selected thought is itself a metaprogramming attribute, such as =favorite or =pin. Commands that edit, format, or restructure a thought are not executable on an attribute, since they would corrupt the attribute or detach it from the thought it configures. Pass the command's multicursor filter so that only the paths the command will execute on are considered. */
const isAttributeSelected = (state: State, filter?: MulticursorFilter): boolean =>
  selectedPaths(state, filter).some(path => isAttribute(headValue(state, path) ?? ''))

export default isAttributeSelected
