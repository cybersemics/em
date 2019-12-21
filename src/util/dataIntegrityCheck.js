import { store } from '../store.js'

// util
import {
  contextOf,
  equalArrays,
  equalThoughtRanked,
  exists,
  getThought,
  getThoughts,
  hashContext,
  headValue,
  pathToContext,
} from '../util.js'

export const dataIntegrityCheck = path => {

  const { settings, contextIndex, thoughtIndex } = store.getState()

  if (!settings.dataIntegrityCheck || !path) return

  const value = headValue(path)
  const encoded = hashContext(path)

  // recreate thoughts missing in thoughtIndex
  ;(contextIndex[encoded] || []).forEach(child => {
    const childExists = exists(child.value, thoughtIndex)

    if (!childExists) {
      console.warn('Recreating missing thought in thoughtIndex:', child.value)
      store.dispatch({
        type: 'newThoughtSubmit',
        context: pathToContext(path),
        rank: child.rank,
        value: child.value
      })
    }

  })

  // recreate thoughts missing in contextIndex
  const thought = getThought(value)
  if (thought && thought.contexts && thought.contexts.length > 1) {

    const cursorContext = contextOf(pathToContext(path))
    const subthoughts = getThoughts(cursorContext)

    const updates = thought.contexts.reduce((accum, cx) => {

      return accum.concat(
        // thought is missing if it has the same context and is not contained in path subthoughts
        equalArrays(cx.context, cursorContext) && !subthoughts.some(subthought => equalThoughtRanked(subthought, {
          rank: cx.rank,
          value: thought.value
        }))
        ? [{
          lastUpdated: cx.lastUpdated,
          rank: cx.rank,
          value: thought.value,
        }]
        : [])
    }, [])

    if (updates.length > 0) {
      const encoded = hashContext(cursorContext)
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