import _ from 'lodash'
import deleteThought from '../reducers/deleteThought'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import head from '../util/head'
import Path from '../@types/Path'
import State from '../@types/State'

/** Deletes an attribute. */
const deleteAtribute = (state: State, { path, key }: { path: Path; key: string }) => {
  if (!path) return state

  const thoughtAttribute = getAllChildrenAsThoughts(state, head(path)).find(child => child.value === key)
  const pathAttribute = thoughtAttribute ? [...path, thoughtAttribute.id] : null

  return pathAttribute && findDescendant(state, head(path), key)
    ? deleteThought(state, {
        pathParent: path,
        showContexts: false,
        thoughtId: head(pathAttribute),
      })
    : state
}

export default _.curryRight(deleteAtribute)
