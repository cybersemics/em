import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { appendToPath, isRoot } from '../util'
import { getLexeme } from '../selectors'
import { SimplePath, State } from '../@types'
import getRootPath from './getRootPath'
import childIdsToThoughts from './childIdsToThoughts'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first
// NOTE: path is pathToContexted
const rankThoughtsFirstMatch = (state: State, pathUnranked: string[]): SimplePath | null => {
  if (isRoot(pathUnranked)) return getRootPath(state)

  // Also supports ranking thoughts from EM context
  const isEmContext = pathUnranked[0] === EM_TOKEN

  const startingContext = isEmContext ? EM_TOKEN : HOME_TOKEN
  const context = pathUnranked.slice(isEmContext ? 1 : 0)

  try {
    return context.reduce<SimplePath>((acc, value, i) => {
      const lexeme = getLexeme(state, value)

      const prevParentId = acc[acc.length - 1] || startingContext

      // get all thoughts that have the desired value within the current context
      const thoughts = childIdsToThoughts(state, (lexeme && lexeme.contexts) || [])
        // Lexeme now stores the actual thought id. To get parent we need to access it using parentId
        .filter(thought => thought?.parentId === prevParentId)

      const finalThought = thoughts[0]

      const isEm = i === 0 && value === EM_TOKEN

      if (!finalThought) throw Error('Thought not found')

      return appendToPath(acc, isEm ? EM_TOKEN : finalThought.id)
    }, [] as any as SimplePath)
  } catch (err) {
    return null
  }
}

export default rankThoughtsFirstMatch
