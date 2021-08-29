import { EM_TOKEN, HOME_PATH } from '../constants'
import { appendToPath, equalThoughtRanked, headId, isRoot, pathToContext } from '../util'
import { getLexeme, getChildrenRanked } from '../selectors'
import { Path, State } from '../@types'
import getRootPath from './getRootPath'
import childIdsToThoughts from './childIdsToThoughts'

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

    const thoughts = childIdsToThoughts(state, (lexeme && lexeme.contexts) || [])
      // Lexeme now stores the actual thought id. To get parent we need to access it using parentId
      .filter(thought => thought?.parentId === headId(path))

    const contextThoughts = thoughts.length > 1 ? getChildrenRanked(state, pathToContext(state, path)) : []

    // If thoughts length is greater than 1 then it means a parent has multiple children with same value.
    // In this case match the first found
    // TODO: May be simply select the first from the thoughts array ??
    const finalThought =
      thoughts.length <= 1
        ? thoughts[0]
        : thoughts.find(thought => {
            return contextThoughts.some(child =>
              equalThoughtRanked(child, {
                value,
                rank: thought.rank,
              }),
            )
          })

    const isEm = i === 0 && value === EM_TOKEN

    const thoughtId = (finalThought ? finalThought.id : '') || ''
    pathResult = appendToPath(pathResult, isEm ? EM_TOKEN : thoughtId)

    return thoughtId
  }) as Path
}

export default rankThoughtsFirstMatch
