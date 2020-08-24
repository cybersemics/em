import { contextOf, pathToContext, reducerFlow } from '../util'
import { State } from '../util/initialState'

import {
  getChildren,
} from '../selectors'

import {
  archiveThought,
  existingThoughtMove,
  setCursor,
} from '../reducers'

import { Path } from '../types'

/** Collpases the active thought. */
const collapseContext = (state: State) => {
  const { cursor } = state

  if (!cursor) {
    return
  }

  const children = getChildren(state, pathToContext(cursor))
  return reducerFlow(
    [
      ...children.map(child =>
        (state: State) => existingThoughtMove(state, {
          oldPath: cursor.concat(child),
          newPath: contextOf(cursor).concat(child) as Path,
        })
      ),
      archiveThought({ path: cursor }),
      setCursor({
        thoughtsRanked: contextOf(cursor).concat(children[0]),
        editing: state.editing,
        offset: children.length
      }),
    ]
  )(state)
}

export default collapseContext
