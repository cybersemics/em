import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getSiblingPaths from '../selectors/getSiblingPaths'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import addMulticursor from './addMulticursor'

/** Adds all siblings of the current cursor (or all root thoughts) to the multicursor set. */
const addAllMulticursor = (state: State): State => {
  const addMulticursorSteps = getSiblingPaths(state).map(path => addMulticursor({ path }))

  return reducerFlow(addMulticursorSteps)(state)
}

/** Action-creator for addAllMulticursor. */
export const addAllMulticursorActionCreator = (): Thunk => dispatch => dispatch({ type: 'addAllMulticursor' })

export default _.curryRight(addAllMulticursor)

// Register this action's metadata
registerActionMetadata('addAllMulticursor', {
  // needs to be undoable for chained commands
  undoable: true,
})
