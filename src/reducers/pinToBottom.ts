import { pathToContext } from '../util'
import { hasChild } from '../selectors'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import { deleteAttribute, newThought } from '../reducers'

interface Options {
  simplePath: SimplePath,
}

/** Pins a thought to the bottom of sorted context. */
const pinToBottom = (state: State, { simplePath }: Options) => {

  const context = pathToContext(simplePath)
  const pinnedTop = hasChild(state, context, '=pinnedTop')
  const pinnedBottom = hasChild(state, context, '=pinnedBottom')

  // Remove pin top if present
  return pinnedTop ? deleteAttribute(state, { context, key: 'pinnedTop' })
    : !pinnedBottom ? newThought({
      at: simplePath,
      insertNewSubthought: true,
      insertBefore: true,
      value: '=pinnedBottom',
      preventSetCursor: true
    })
    : state
}

export default pinToBottom
