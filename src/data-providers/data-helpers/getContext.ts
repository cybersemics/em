import Context from '../../@types/Context'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import hashThought from '../../util/hashThought'
import head from '../../util/head'
import isRoot from '../../util/isRoot'
import { DataProvider } from '../DataProvider'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first

/**
 * For the given array of thought ids returns the parent entries.
 */
const childIdsToThoughts = async (provider: DataProvider, childIds: ThoughtId[]) => {
  const thoughts = await provider.getThoughtsByIds(childIds)
  // If any one of the thoughts are not found return null
  return thoughts.length < childIds.length ? null : thoughts
}

// TODO: This is almost same logic as rankThoughtFirstMatch selector. Can this be reused ??
/**
 * Finds the path for the given unranked path from the given data provider directly.
 */
const contextToThoughts = async (provider: DataProvider, pathUnranked: string[]): Promise<Thought[] | null> => {
  if (isRoot(pathUnranked)) {
    const rootThought = await provider.getThoughtById(pathUnranked[0] as ThoughtId)
    return rootThought ? [rootThought] : null
  }

  // Also supports ranking thoughts from EM context
  const isEmContext = pathUnranked[0] === EM_TOKEN

  if (isEmContext && pathUnranked.length === 1) {
    const emThought = await provider.getThoughtById(EM_TOKEN)
    return emThought ? [emThought] : null
  }

  const startingContext = isEmContext ? EM_TOKEN : HOME_TOKEN
  const context = pathUnranked.slice(isEmContext ? 1 : 0)

  try {
    return await context.reduce<Promise<Thought[]>>(async (accPromise, value, i) => {
      const acc = await accPromise
      const lexeme = await provider.getLexemeById(hashThought(value))

      const prevParentId = acc[acc.length - 1]?.id || startingContext

      // get all thoughts that have the desired value within the current context
      const allThoughts = await childIdsToThoughts(provider, (lexeme && lexeme.contexts) || [])

      if (!allThoughts) throw Error('Thought not found')

      // Lexeme now stores the actual thought id. To get parent we need to access it using parentId
      const thoughts = allThoughts.filter((thought): thought is Thought => thought?.parentId === prevParentId)

      const finalThought = thoughts[0]

      if (!finalThought) throw new Error(`Thought not found`)

      const isEm = i === 0 && value === EM_TOKEN

      const emThought = await provider.getThoughtById(EM_TOKEN)

      if (!emThought) throw new Error(`Em thought not found`)

      return [...acc, isEm ? emThought : finalThought]
    }, Promise.resolve([]))
  } catch (err) {
    return null
  }
}

/** Gets the Parent for a context. */
const getContext = async (provider: DataProvider, context: Context) => {
  const path = await contextToThoughts(provider, context)
  return path ? head(path) : null
}

export default getContext
