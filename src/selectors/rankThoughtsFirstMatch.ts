import { EM_TOKEN, HOME_PATH } from '../constants'
import { appendToPath, equalThoughtRanked, headId, isRoot, pathToContext } from '../util'
import { getLexeme, getChildrenRanked } from '../selectors'
import { Path, State } from '../@types'
import getRootPath from './getRootPath'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first
// NOTE: path is pathToContexted
const rankThoughtsFirstMatch = (state: State, pathUnranked: string[]): Path => {
  if (isRoot(pathUnranked)) return getRootPath(state)

  let pathResult: Path = HOME_PATH // eslint-disable-line fp/no-let
  // let prevParentContext = [HOME_TOKEN] // eslint-disable-line fp/no-let

  return pathUnranked.map((value, i) => {
    const lexeme = getLexeme(state, value)
    const path = pathResult

    const parents = ((lexeme && lexeme.contexts) || [])
      // Lexeme now stores the actual thought id. To get parent we need to access it using parentId
      .map(thoughtId => {
        const thought = state.thoughts.contextIndex[thoughtId]
        return state.thoughts.contextIndex[thought.parentId]
      })
      .filter(p => {
        return p.id === headId(path)
      })

    const contextThoughts = parents.length > 1 ? getChildrenRanked(state, pathToContext(state, path)) : []

    // there may be duplicate parents that are missing from contextIndex
    // in this case, find the matching thought
    const parent =
      parents.length <= 1
        ? parents[0]
        : parents.find(parent => {
            return contextThoughts.some(child =>
              equalThoughtRanked(child, {
                value,
                rank: parent.rank,
              }),
            )
          })

    // if (parent && parent.context) {
    //   prevParentContext = parent.context
    // }

    const isEm = i === 0 && value === EM_TOKEN

    const parentId = (parent ? parent.id : '') || ''
    pathResult = appendToPath(pathResult, isEm ? EM_TOKEN : parentId)

    return parentId
  }) as Path
}

export default rankThoughtsFirstMatch
