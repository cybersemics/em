import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { HOME_TOKEN } from '../constants'
import { getChildrenSorted } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import addMulticursor from './addMulticursor'

/** Adds all siblings of the current cursor (or all root thoughts) to the multicursor set. */
const addAllMulticursor = (state: State): State => {
  const { cursor } = state
  const parentId = cursor ? head(rootedParentOf(state, cursor)) : HOME_TOKEN
  const siblings = getChildrenSorted(state, parentId)

  const addMulticursorSteps = siblings.map(sibling => (state: State) => {
    const siblingPath: Path = cursor ? [...parentOf(cursor), sibling.id] : [sibling.id]
    return addMulticursor(state, { path: siblingPath })
  })

  return reducerFlow(addMulticursorSteps)(state)
}

/** Action-creator for addAllMulticursor. */
export const addAllMulticursorActionCreator =
  ({
    mergeUndo,
  }: {
    /** Forces the next command to be merged into this during chained gestures. Note that mergeUndo is not referenced by the reducer at all; it is read directly from the action object by undoRedoEnhancer. */
    mergeUndo?: boolean
  }): Thunk =>
  dispatch =>
    dispatch({ type: 'addAllMulticursor', mergeUndo })

export default _.curryRight(addAllMulticursor)

// Register this action's metadata
registerActionMetadata('addAllMulticursor', {
  // needs to be undoable for chained commands
  undoable: true,
})
