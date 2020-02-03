import { store } from '../store.js'
import * as _ from 'lodash'

// util
import {
  contextOf,
  equalArrays,
  equalThoughtRanked,
  exists,
  getSetting,
  getThought,
  getThoughtsRanked,
  hashContext,
  hashThought,
  head,
  headRank,
  headValue,
  pathToContext,
  rootedContextOf,
  timestamp,
  unroot,
} from '../util.js'

export const dataIntegrityCheck = path => {

  const { contextIndex, thoughtIndex } = store.getState()

  if (getSetting('Data Integrity Check')[0] !== 'On' || !path) return

  const thoughtRanked = head(path)
  const value = headValue(path)
  const rank = headRank(path)
  const encoded = hashContext(path)
  const thought = getThought(value)
  const pathContext = contextOf(pathToContext(path))

  // delete duplicate thoughts in contextIndex
  const uniqueThoughts = _.uniqBy(contextIndex[encoded], child => child.value + '__SEP' + child.rank)
  if (contextIndex[encoded] && uniqueThoughts.length < contextIndex[encoded].length) {
    console.warn('Deleting duplicate thoughts in contextIndex:', value)
    store.dispatch({
      type: 'thoughtIndex',
      contextIndexUpdates: {
        [encoded]: uniqueThoughts
      },
      forceRender: true
    })
    return
}

  // recreate thoughts missing in thoughtIndex
  for (const child of (contextIndex[encoded] || [])) { // eslint-disable-line fp/no-loops,fp/no-let
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
      return
    }
  }

  if (thought && thought.contexts) {

    // recreate thoughts missing in thought.contexts
    const matchingThoughtInContexts = thought.contexts.find(cx => cx.context && equalArrays(unroot(cx.context), pathContext))
    if (!matchingThoughtInContexts) {
      console.warn('Recreating missing thought in thought.contexts:', path)
      store.dispatch({
        type: 'newThoughtSubmit',
        context: pathContext,
        rank,
        value
      })
    }

    // recreate thoughts missing in contextIndex
    const contextSubthoughts = getThoughtsRanked(pathContext)
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
    // sync divergent ranks
    else {
      const contextIndexThoughtsMatchingValue = getThoughtsRanked(rootedContextOf(path))
        .filter(child => child.value === value)

      if (contextIndexThoughtsMatchingValue.length > 0) {
        const thoughtsMatchingValueAndRank = contextIndexThoughtsMatchingValue.filter(child => equalThoughtRanked(thoughtRanked, child))
        if (thoughtsMatchingValueAndRank.length === 0) {
          const contextIndexRank = contextIndexThoughtsMatchingValue[0].rank
          const thoughtEncoded = hashThought(value)

          // change rank in thoughtIndex to that from contextIndex
          console.warn('Syncing divergent ranks:', value)
          store.dispatch({
            type: 'thoughtIndex',
            thoughtIndexUpdates: {
              [thoughtEncoded]: {
                ...thought,
                contexts: thought.contexts.map(parent => equalArrays(unroot(parent.context), pathContext) ? {
                  ...parent,
                  rank: contextIndexRank
                } : parent)
              }
            },
            forceRender: true
          })
        }
      }
    }
  }
}
