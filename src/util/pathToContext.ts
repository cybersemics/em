import Context from '../@types/Context'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import { isContextStep, stepId } from './pathStep'

/** Converts a Path to a Context, i.e. the values the user sees at each step. A context step contributes the value of the context, not of the Lexeme instance it lands on, so a/m~/b converts to ['a', 'm', 'b']. */
const pathToContext = (state: State, path: Path): Context =>
  path.map(step => {
    const id = stepId(step)
    const thought = getThoughtById(state, id)
    if (!thought) throw Error('pathToContext: Missing thought with id ' + id)
    if (!isContextStep(step)) return thought.value
    const context = getThoughtById(state, thought.parentId)
    if (!context) throw Error('pathToContext: Missing context with id ' + thought.parentId)
    return context.value
  })

export default pathToContext
