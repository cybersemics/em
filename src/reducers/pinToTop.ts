import { pathToContext } from '../util'
import { hasChild } from '../selectors'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import { deleteAttribute, newThought } from '../reducers'

interface Options {
  simplePath: SimplePath,
}

/** Pins a thought to the top of sorted context. */
const pinToTop = (state: State, { simplePath }: Options) => {

  const context = pathToContext(simplePath)
  const pinnedTop = hasChild(state, context, '=pinnedTop')
  const pinnedBottom = hasChild(state, context, '=pinnedBottom')

  // Remove pin top if present
  return pinnedBottom ? deleteAttribute(state, { context, key: 'pinnedBottom' })
    : !pinnedTop ? newThought({
      at: simplePath,
      insertNewSubthought: true,
      insertBefore: true,
      value: '=pinnedBottom',
      preventSetCursor: true
    })
    : state
}

export default pinToTop
