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

  // @ts-ignore
  const children = getChildren(state, pathToContext(cursor))
  return reducerFlow(
    [
      ...children.map(child =>
        (state: State) => existingThoughtMove(state, {
          // @ts-ignore
          oldPath: cursor.concat(child),
          // @ts-ignore
          newPath: contextOf(cursor).concat(child) as Path,
        })
      ),
      archiveThought({ path: cursor }),
      setCursor({
        // @ts-ignore
        thoughtsRanked: contextOf(cursor).concat(children[0]),
        editing: state.editing,
        offset: children.length
      }),
    ]
  )(state)
}

export default collapseContext
