/**
 * This script runs client-side (in the browser console) and operate directly on in-memory data using window.em and then dispatching updateThoughts to sync.
 */

/** Iterates through each lexeme in lexemeIndex, identifies lexeme.contexts that are not replicated in thoughtIndex, and generates thoughtIndexUpdates that are dispatched to restore them. */
let fixThoughtIndex = (max = 100000) => {
  const { thoughtIndex, lexemeIndex } = em.store.getState().thoughts
  const thoughtIndexUpdates = {}

  Object.keys(lexemeIndex)
    .slice(0, max)
    .forEach(key => {
      const lexeme = lexemeIndex[key]
      if (!lexeme.contexts) return

      // check that each of the lexeme's contexts and its ancestors exist in thoughtIndex
      lexeme.contexts.forEach(cx => {
        if (!cx.context)
          return // subcontexts
          // Note: Concat lexeme value too else it won't check for it's ancestor io thoughtIndex
        ;[...cx.context, lexeme.lemma].forEach((value, i) => {
          // don't check root
          if (i === 0) return

          const context = cx.context.slice(0, i)
          // get children of the lexeme context
          const encoded = em.hashContext(context)
          const parentEntry = thoughtIndex[encoded]
          const parentEntryAccum = thoughtIndexUpdates[encoded]
          const children =
            (parentEntryAccum && parentEntryAccum.children) || (parentEntry && parentEntry.children) || []
          const isInThoughtIndex = children.some(
            child => em.hashThought(child.value) === em.hashThought(value) /* && child.rank === cx.rank*/,
          )

          // if the lexeme context is not in the thoughtIndex it is supposed to be, then generate an update to add it
          if (!isInThoughtIndex) {
            const lastUpdated = cx.lastUpdated || lexeme.lastUpdated || ''
            // if we're at the last context, which is the whole cx.context, use cx.rank
            // otherwise generate a large rank so it doesn't conflict
            const rank = i === cx.context.length - 1 ? cx.rank : i + 1000
            const valueNew = value
            thoughtIndexUpdates[encoded] = {
              context,
              children: [
                ...children.filter(child => em.hashThought(child.value) !== em.hashThought(valueNew)),
                {
                  // guard against undefined
                  lastUpdated,
                  rank,
                  value: valueNew,
                },
              ],
              lastUpdated: lastUpdated,
              id: parentEntryAccum.id,
            }
          }
        })
      }, {})
    })

  const numUpdates = Object.keys(thoughtIndexUpdates).length
  if (numUpdates > 0) {
    console.info(`Recreating ${numUpdates} missing lexemes in thoughtIndex.`)
    em.store.dispatch({
      type: 'updateThoughts',
      thoughtIndexUpdates,
    })
  } else {
    console.info('All lexemes have a thoughtIndex entry.')
  }
}
