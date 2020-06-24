/** Iterates through each lexeme in thoughtIndex, identifies lexeme.contexts that are not replicated in contextIndex, and generates contextIndexUpdates that are dispatched to restore them. */
let recreateMissingContextIndex = (max = 100000) => {

  const { contextIndex, thoughtIndex } = em.store.getState().thoughts
  const contextIndexUpdates = {}

  Object.keys(thoughtIndex)
    .slice(0, max)
    .forEach(key => {
      const lexeme = thoughtIndex[key]
      if (!lexeme.contexts) return

      // check that each of the lexeme's contexts and its ancestors exist in contextIndex
      lexeme.contexts.forEach((cx) => {
        if (!cx.context) return

        // subcontexts
        cx.context.forEach((value, i) => {

          // don't check root
          if (i === 0) return

          const context = cx.context.slice(0, i)

          // get children of the lexeme context
          const encoded = em.hashContext(context)
          const parentEntry = contextIndex[encoded]
          const parentEntryAccum = contextIndexUpdates[encoded]
          const children = (parentEntryAccum && parentEntryAccum.children) ||
            (parentEntry && parentEntry.children) ||
            []
          const isInContextIndex = children
            .some(child => em.hashThought(child.value) === em.hashThought(value)/* && child.rank === cx.rank*/)

          // if the lexeme context is not in the contextIndex it is supposed to be, then generate an update to add it
          if (!isInContextIndex) {
            const lastUpdated = cx.lastUpdated || lexeme.lastUpdated || ''
            // if we're at the last context, which is the whole cx.context, use cx.rank
            // otherwise generate a large rank so it doesn't conflict
            const rank = i === cx.context.length - 1 ? cx.rank : i + 1000
            const valueNew = value
            contextIndexUpdates[encoded] = {
              children: [
                ...children.filter(child => em.hashThought(child.value) !== em.hashThought(valueNew)),
                {
                  // guard against undefined
                  lastUpdated,
                  rank,
                  value: valueNew,
                }
              ],
              lastUpdated: lastUpdated,
            }
          }
        })
      }, {})
    })

  const numUpdates = Object.keys(contextIndexUpdates).length
  if (numUpdates > 0) {
    console.info(`Recreating ${numUpdates} missing lexemes in contextIndex.`)
    em.store.dispatch({
      type: 'updateThoughts',
      contextIndexUpdates,
    })
  }
  else {
    console.info('All lexemes have a contextIndex entry.')
  }
}
