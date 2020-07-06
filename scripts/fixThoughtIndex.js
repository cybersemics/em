/**
 * This script runs client-side (in the browser console) and operate directly on in-memory data using window.em and then dispatching updateThoughts to sync.
 */

/** Recursively traverses the contextIndex starting with the root, and performs several automatic fixes on all reachable descendants (with the corresponding context in thoughtIndex as needed):
 *   - missing lexeme
 *   - missing rank
 *   - missing id
 *   - inconsistent rank between contextIndex and thoughtIndex
 */
let fixThoughtIndex = (maxDepth = 100) => {
  const { contextIndex, thoughtIndex } = em.store.getState().thoughts
  const contextIndexUpdates = {}
  const thoughtIndexUpdates = {}

  const ROOT_TOKEN = '__ROOT__'

  /** Clones a JSON object. */
  const clone = x => {
    let result
    try {
      result = JSON.parse(JSON.stringify(x))
    }
    catch (e) {
      console.error('Error parsing:', x)
      throw new Error("Clone parse error")
    }
    return result
  }

  /** Generate a timestamp of now. */
  const timestamp = () => new Date().toISOString()

  /** Remove the root token. */
  const unroot = thoughts =>
    thoughts.length > 0 && (thoughts[0] === ROOT_TOKEN || thoughts[0].value === ROOT_TOKEN)
      ? thoughts.slice(1)
      : thoughts

  /** Equality for lists. */
  const equalArrays = (a, b) =>
    a === b ||
    (a && b &&
    a.length === b.length &&
    a.find &&
    // compare with null to avoid false positive for ''
    a.find((thought, i) => b[i] !== thought)) == null

  const generateUpdates = (context, depth = 0) => {
    if (depth >= maxDepth) return

    // recurse on children
    const children = em.getThoughts(context)
    const contextEncoded = em.hashContext(context)
    let parentEntry = contextIndex[contextEncoded]

    children.forEach((child, i) => {

      // check if value has a corresponding lexeme context
      const thoughtEncoded = em.hashThought(child.value)
      const lexeme = thoughtIndexUpdates[thoughtEncoded] || em.getThought(child.value)
      const rankRandom = Math.floor(Math.random() * 100000000000)
      const idRandom = Math.floor(Math.random() * 100000000000)
      const noRank = child.rank == null
      const noId = child.id == null

      // fix null or undefined rank in contextIndex
      if (noId || noRank) {
        child.rank = child.rank || rankRandom
        child.id = child.id || idRandom
        parentEntry = contextIndexUpdates[contextEncoded] = clone(parentEntry)
        contextIndexUpdates[contextEncoded].lastUpdated = timestamp()
      }

      // recreate missing lexeme
      if (!lexeme) {
        thoughtIndexUpdates[thoughtEncoded] = {
          value: child.value,
          created: parentEntry.lastUpdated,
          lastUpdated: timestamp(),
          contexts: [{
            context,
            rank: child.rank,
            lastUpdated: parentEntry.lastUpdated
          }]
        }
      }
      // check for inconsistent rank
      else {
        let shouldUpdate = false
        const contextsNew = lexeme.contexts.reduce((accum, thoughtContext) => {

          // if (em.hashThought(child.value) === em.hashThought('RelevanceTruth')) {
          //   console.log('')
          //   console.log('context', context)
          //   console.log('child', child)
          //   console.log('thoughtContext', thoughtContext)
          // }

          // fix null or undefined rank in thoughtContext
          if (thoughtContext.rank == null) {
            shouldUpdate = true
            return [...accum, {
              context,
              id: child.id,
              rank: child.rank,
              lastUpdated: timestamp()
            }]
          }
          // fix inconsistent rank
          else if(equalArrays(thoughtContext.context, context) && child.rank !== thoughtContext.rank) {
            shouldUpdate = true
            return [...accum, {
              context,
              id: child.id,
              rank: child.rank,
              lastUpdated: timestamp()
            }]
          }
          // if there there was no id on the contextIndex child, then we need to set the thoughtIndex id to match
          else if (noId) {
            shouldUpdate = true
            return [...accum, {
              context,
              id: idRandom,
              rank: child.rank,
              lastUpdated: timestamp()
            }]
          }
          else {
            return accum
          }
        }, [])

        if (shouldUpdate) {
          thoughtIndexUpdates[thoughtEncoded] = {
            value: lexeme.value || child.value,
            created: parentEntry.lastUpdated,
            lastUpdated: timestamp(),
            contexts: contextsNew
          }

          // if (em.hashThought(child.value) === em.hashThought('RelevanceTruth')) {
          //   console.log('')
          //   console.log('context', context)
          //   console.log('child', child)
          //   console.log('lexeme', lexeme)
          // }
        }
      }

      const contextNew = [...unroot(context), child.value]
      generateUpdates(contextNew, depth + 1)
    })

  }

  // start recursion
  generateUpdates(['__ROOT__'])

  const numParentUpdates = Object.keys(contextIndexUpdates).length
  const numLexemeUpdates = Object.keys(thoughtIndexUpdates).length
  if (numParentUpdates > 0 || numLexemeUpdates > 0) {
    console.info(`Updating ${numParentUpdates} parents.`)
    console.info(`Updating ${numLexemeUpdates} lexemes.`)
    // console.log('contextIndexUpdates', contextIndexUpdates)
    // console.log('thoughtIndexUpdates', thoughtIndexUpdates)
    em.store.dispatch({
      type: 'updateThoughts',
      contextIndexUpdates,
      thoughtIndexUpdates,
    })
  }
  else {
    console.info('No updates.')
  }
}

fixThoughtIndex(20)
