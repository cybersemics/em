import _ from 'lodash'
import { deleteThought } from '../reducers'
import { hasChild } from '../selectors'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'
import { head, pathToContext } from '../util'
import { Path, State } from '../@types'

/** Deletes an attribute. */
const deleteAtribute = (state: State, { path, key }: { path: Path; key: string }) => {
  if (!path) return state

  const context = pathToContext(state, path)
  const thoughtAttribute = getAllChildrenAsThoughtsById(state, head(path)).find(child => child.value === key)
  const pathAttribute = thoughtAttribute ? [...path, thoughtAttribute.id] : null

  return pathAttribute && hasChild(state, head(path), key)
    ? deleteThought(state, {
        context,
        showContexts: false,
        thoughtId: head(pathAttribute),
      })
    : state
}

export default _.curryRight(deleteAtribute)
