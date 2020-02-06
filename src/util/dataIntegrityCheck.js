import { store } from '../store.js'

// util
import {
  contextOf,
  equalArrays,
  exists,
  getThought,
  getThoughtsRanked,
  hashContext,
  hashThought,
  headRank,
  headValue,
  pathToContext,
  timestamp,
  unroot,
} from '../util.js'

export const dataIntegrityCheck = path => {

  const { settings, contextIndex, thoughtIndex } = store.getState()

  if (!settings.dataIntegrityCheck || !path) return

  const value = headValue(path)
  const rank = headRank(path)
  const encoded = hashContext(path)
  const thought = getThought(value)
  const pathContext = contextOf(pathToContext(path))
  const contextSubthoughts = getThoughtsRanked(pathContext)

  // recreate thoughts missing in thoughtIndex
  ;(contextIndex[encoded] || []).forEach(child => {
    const childExists = exists(child.value, thoughtIndex)
    if (!childExists) {
      console.warn('Recreating missing thought in thoughtIndex:', child.value)
      store.dispatch({
        type: 'newThoughtSubmit',
        context: pathToContext(path),
        // guard against undefined
        rank: child.rank || 0,
        value: child.value || ''
      })
    }
  })

  if (thought && thought.contexts) {

    // recreate thoughts missing in thought.contexts
    if (!thought.contexts.find(cx => cx.context && equalArrays(unroot(cx.context), pathContext))) {
      console.warn('Recreating missing thought in thought.contexts:', path)
      store.dispatch({
        type: 'newThoughtSubmit',
        context: pathContext,
        rank,
        value
      })
    }

    // recreate thoughts missing in contextIndex
    const updates = thought.contexts.reduce((accum, cx) =>
      accum.concat(
        // thought is missing if it has the same context and is not contained in path contextSubthoughts
        equalArrays(cx.context, pathContext) && !contextSubthoughts.some(subthought => hashThought(subthought.value) === hashThought(thought.value) && subthought.rank === cx.rank)
        ? [{
          // guard against undefined
          lastUpdated: cx.lastUpdated || timestamp(),
          rank: cx.rank || 0,
          value: thought.value || '',
        }]
        : [])
    , [])

    if (updates.length > 0) {
      const encoded = hashContext(pathContext)
      console.warn('Recreating missing thoughts in contextIndex:', updates)
      store.dispatch({
        type: 'thoughtIndex',
        contextIndexUpdates: {
          [encoded]: contextIndex[encoded].concat(updates)
        },
        forceRender: true
      })
    }
  }
}
