/** Recursively traverses the contextIndex starting with the root, identifies contexts and ancestors that do not have a corresponding lexeme in thoughtIndex, and generates thoughtIndexUpdates that are dispatched to restore them. */
let recreateMissingThoughtIndex = (maxDepth = 100) => {
  const { contextIndex, thoughtIndex } = em.store.getState().thoughts
  const thoughtIndexUpdates = {}

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
    const parentEntry = contextIndex[em.hashContext(context)]

    children.forEach(child => {

      // check if value has a corresponding lexeme context
      const thoughtEncoded = em.hashThought(child.value)
      const lexeme = thoughtIndexUpdates[thoughtEncoded] || em.getThought(child.value)
      // console.log('context', context)
      // console.log('lexeme', lexeme)

      if (!lexeme) {
        thoughtIndexUpdates[em.hashThought(child.value)] = {
          value: child.value,
          created: parentEntry.lastUpdated,
          lastUpdated: parentEntry.lastUpdated,
          contexts: [{
            context,
            rank: child.rank,
            lastUpdated: parentEntry.lastUpdated
          }]
        }
      }
      else if(!lexeme.contexts.some(thoughtContext => equalArrays(thoughtContext.context, context))) {
        thoughtIndexUpdates[thoughtEncoded] = {
          ...lexeme,
          contexts: [...lexeme.contexts, {
            context,
            rank: child.rank,
            lastUpdated: parentEntry.lastUpdated,
          }],
        }
      }

      const contextUnrooted = context[0] === '__ROOT__' ? context.slice(1) : context
      const contextNew = [...contextUnrooted, child.value]
      generateUpdates(contextNew, depth + 1)
    })

  }

  generateUpdates(['__ROOT__'])
  const numUpdates = Object.keys(thoughtIndexUpdates).length
  if (numUpdates > 0) {
    console.info(`Recreating ${numUpdates} missing lexeme contexts.`)
    // console.log('thoughtIndexUpdates', thoughtIndexUpdates)
    em.store.dispatch({
      type: 'updateThoughts',
      thoughtIndexUpdates,
    })
  }
  else {
    console.info('All reachable contexts have a lexeme.')
  }
}
