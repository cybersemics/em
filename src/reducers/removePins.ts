import { pathToContext, reducerFlow } from '../util'
import { hasChild } from '../selectors'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import { deleteAttribute } from '../reducers'

/** Removes pin attribute from an input path. */
const removePins = (state: State, simplePath: SimplePath) => {

  const context = pathToContext(simplePath)
  const pinnedTop = hasChild(state, context, '=pinnedTop')
  const pinnedBottom = hasChild(state, context, '=pinnedBottom')

  return reducerFlow([
    pinnedTop ? deleteAttribute({ context, key: '=pinnedTop' }) : null,
    pinnedBottom ? deleteAttribute({ context, key: '=pinnedBottom' }) : null,
  ])(state)
}

export default removePins
