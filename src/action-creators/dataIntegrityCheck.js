import _ from 'lodash'

// util
import {
  contextOf,
  equalArrays,
  equalThoughtRanked,
  equalThoughtValue,
  hashContext,
  hashThought,
  head,
  headRank,
  headValue,
  pathToContext,
  rootedContextOf,
  timestamp,
  unroot,
} from '../util'

// selectors
import {
  exists,
  getSetting,
  getThought,
  getThoughts,
  getThoughtsRanked,
} from '../selectors'

const disableAll = true
const deleteDuplicateContextIndex = true
const recreateMissingContextIndex = true
const recreateMissingThoughtIndex = true
const recreateMissingThoughtContexts = true
const syncDivergentRanks = true

/** Performs a data integrity check and is able to fix minor problems with thoughtIndex and contextIndex being out of sync. */
const dataIntegrityCheck = path => (dispatch, getState) => {

  if (disableAll) return

  const state = getState()
  const { contextIndex } = state.thoughts
  // console.log('dataIntegrityCheck', pathToContext(path))

  if (getSetting(state, 'Data Integrity Check') !== 'On' || !path) return

  const thoughtRanked = head(path)
  const value = headValue(path)
  const rank = headRank(path)
  const encoded = hashContext(path)
  const thought = getThought(state, value)
  const pathContext = contextOf(pathToContext(path))

  // delete duplicate thoughts in contextIndex
  if (deleteDuplicateContextIndex) {
    const uniqueThoughts = _.uniqBy(contextIndex[encoded], child => child.value + '__SEP' + child.rank)
    if (contextIndex[encoded] && uniqueThoughts.length < contextIndex[encoded].length) {
      console.warn('Deleting duplicate thoughts in contextIndex:', value)
      dispatch({
        type: 'updateThoughts',
        contextIndexUpdates: {
          [encoded]: uniqueThoughts
        },
        forceRender: true
      })

      return
    }
  }

  // recreate thoughts missing in thoughtIndex
  if (recreateMissingThoughtIndex) {
    for (const child of contextIndex[encoded] || []) { // eslint-disable-line fp/no-loops,fp/no-let
      const childExists = exists(state, child.value)
      if (!childExists) {
        console.warn('Recreating missing thought in thoughtIndex:', child.value)
        dispatch({
          type: 'newThoughtSubmit',
          context: pathToContext(path),
          // guard against undefined
          rank: child.rank || 0,
          value: child.value || ''
        })
        return
      }
    }
  }

  if (thought && thought.contexts) {

    // recreate thoughts missing in thought.contexts
    if (recreateMissingThoughtContexts) {
      const matchingThoughtInContexts = thought.contexts.find(cx => cx.context && equalArrays(unroot(cx.context), pathContext))
      if (!matchingThoughtInContexts) {
        console.warn('Recreating missing thought in thought.contexts:', path)
        dispatch({
          type: 'newThoughtSubmit',
          context: pathContext,
          rank,
          value
        })
      }
    }

    // recreate thoughts missing in contextIndex
    // const contextSubthoughts = getThoughtsRanked(state, pathContext)
    // console.log('contextSubthoughts', contextSubthoughts)
    // console.log('contextIndex[encoded]', contextIndex[encoded])
    // console.log('thought.contexts', thought.contexts)
    if (recreateMissingContextIndex) {
      const contextIndexUpdates = thought.contexts.reduce((accum, cx) => {
        // console.log('')
        // console.log('cx.context', cx.context)
        const otherContextChildren = getThoughts(state, cx.context)
        // console.log('otherContextChildren', otherContextChildren)
        const otherContextHasThought = otherContextChildren
          .some(child => hashThought(child.value) === hashThought(thought.value) && child.rank === cx.rank)
        // console.log('otherContextHasThought', otherContextHasThought)
        const encoded = hashContext(cx.context)
        const contextIndexUpdatesNew = !otherContextHasThought ? {
          [encoded]: [
            ...accum[encoded] || contextIndex[encoded] || [],
            {
              // guard against undefined
              lastUpdated: cx.lastUpdated || timestamp(),
              rank: cx.rank || 0,
              value: thought.value || '',
            }
          ]
        } : {}
        // console.log('contextIndexUpdatesNew', contextIndexUpdatesNew)
        return {
          ...accum,
          ...contextIndexUpdatesNew,
        }
      }, {})

      // console.log('contextIndexUpdates', contextIndexUpdates)

      if (Object.keys(contextIndexUpdates).length > 0) {
        console.warn('Recreating missing thoughts in contextIndex:', contextIndexUpdates)
        dispatch({
          type: 'updateThoughts',
          contextIndexUpdates,
          forceRender: true
        })
      }
      return
    }

    // sync divergent ranks
    if (syncDivergentRanks) {
      const contextIndexThoughtsMatchingValue = getThoughtsRanked(state, rootedContextOf(path))
        .filter(equalThoughtValue(value))

      if (contextIndexThoughtsMatchingValue.length > 0) {
        const thoughtsMatchingValueAndRank = contextIndexThoughtsMatchingValue.filter(child => equalThoughtRanked(thoughtRanked, child))
        if (thoughtsMatchingValueAndRank.length === 0) {
          const contextIndexRank = contextIndexThoughtsMatchingValue[0].rank
          const thoughtEncoded = hashThought(value)

          // change rank in thoughtIndex to that from contextIndex
          console.warn('Syncing divergent ranks:', value)
          dispatch({
            type: 'updateThoughts',
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

export default dataIntegrityCheck
