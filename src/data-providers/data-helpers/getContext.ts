import { Context, Parent } from '../../@types'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import { hashThought, head, isRoot } from '../../util'
import { DataProvider } from '../DataProvider'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first

/**
 * For the given array of thought ids returns the parent entries.
 */
const childIdsToThoughts = async (provider: DataProvider, childIds: string[]) => {
  const thoughts = await provider.getContextsByIds(childIds)
  // If any one of the thoughts are not found return null
  return thoughts.length < childIds.length ? null : thoughts
}

// TODO: This is almost same logic as rankThoughtFirstMatch selector. Can this be reused ??
/**
 * Finds the path for the given unranked path from the given data provider directly.
 */
const rankThoughtsFirstMatch = async (provider: DataProvider, pathUnranked: string[]) => {
  if (isRoot(pathUnranked)) {
    const rootThought = await provider.getContextById(pathUnranked[0])
    return rootThought ? [rootThought] : null
  }

  // Also supports ranking thoughts from EM context
  const isEmContext = pathUnranked[0] === EM_TOKEN

  const startingContext = isEmContext ? EM_TOKEN : HOME_TOKEN
  const context = pathUnranked.slice(isEmContext ? 1 : 0)

  try {
    return await context.reduce<Promise<Parent[]>>(async (accPromise, value, i) => {
      const acc = await accPromise
      const lexeme = await provider.getThoughtById(hashThought(value))

      const prevParentId = acc[acc.length - 1]?.id || startingContext

      // get all thoughts that have the desired value within the current context
      const allThoughts = await childIdsToThoughts(provider, (lexeme && lexeme.contexts) || [])

      if (!allThoughts) throw Error('Thought not found')

      // Lexeme now stores the actual thought id. To get parent we need to access it using parentId
      const thoughts = (allThoughts as Parent[]).filter(thought => thought?.parentId === prevParentId)

      const finalThought = thoughts[0]

      if (!finalThought) throw new Error(`Thought not found`)

      const isEm = i === 0 && value === EM_TOKEN

      const emThought = await provider.getContextById(EM_TOKEN)

      if (!emThought) throw new Error(`Em thought not found`)

      return [...acc, isEm ? emThought : finalThought]
    }, Promise.resolve([]))
  } catch (err) {
    return null
  }
}

/** Gets the Parent for a context. */
const getContext = async (provider: DataProvider, context: Context) => {
  const rankedThoughts = await rankThoughtsFirstMatch(provider, context)
  return rankedThoughts ? head(rankedThoughts) : null
}

export default getContext
