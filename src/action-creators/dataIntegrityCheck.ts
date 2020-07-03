import _ from 'lodash'
import { ActionCreator, Path, ThoughtContext } from '../types'

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
  splitChain,
} from '../selectors'

const disableAll = true
const deleteDuplicateContextIndex = true
const recreateMissingContextIndex = true
const recreateMissingThoughtIndex = true
const recreateMissingThoughtContexts = true
const syncDivergentRanks = true

/** Performs a data integrity check and is able to fix minor problems with thoughtIndex and contextIndex being out of sync. */
const dataIntegrityCheck = (path: Path): ActionCreator => (dispatch, getState) => {

  if (disableAll) return

  const state = getState()

  if (getSetting(state, 'Data Integrity Check') !== 'On' || !path) return

  // do not perform Data Integrity Check within context view otherwise chaos will ensue
  if (splitChain(state, path).length > 1) return

  const contextIndex = state.thoughts.contextIndex ?? {}
  const thoughtRanked = head(path)
  const value = headValue(path)
  const rank = headRank(path)
  const encoded = hashContext(path)
  const thought = getThought(state, value)
  const pathContext = contextOf(pathToContext(path))

  // delete duplicate thoughts in contextIndex
  if (deleteDuplicateContextIndex) {
    const parentEntry = contextIndex[encoded]
    const children = (parentEntry || {}).children || []
    const childrenUnique = _.uniqBy(children, child => child.value + '__SEP' + child.rank)
    if (parentEntry && childrenUnique.length < children.length) {
      console.warn('Deleting duplicate thoughts in contextIndex:', value)
      dispatch({
        type: 'updateThoughts',
        contextIndexUpdates: {
          [encoded]: {
            children: childrenUnique,
            lastUpdated: parentEntry.lastUpdated,
          }
        },
        forceRender: true
      })

      return
    }
  }

  // recreate thoughts missing in thoughtIndex
  if (recreateMissingThoughtIndex) {
    const children = (contextIndex[encoded] || {}).children || []
    for (const child of children) { // eslint-disable-line fp/no-loops,fp/no-let
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
          value,
        })
      }
    }

    // recreate thoughts missing in contextIndex
    // const contextSubthoughts = getThoughtsRanked(state, pathContext)
    if (recreateMissingContextIndex) {
      const contextIndexUpdates = thought.contexts.reduce((accum: any, cx: ThoughtContext) => {
        const otherContextChildren = getThoughts(state, cx.context)
        const otherContextHasThought = otherContextChildren
          .some(child => hashThought(child.value) === hashThought(thought.value) && child.rank === cx.rank)
        const encoded = hashContext(cx.context)
        const parentEntry = contextIndex[encoded]
        const parentEntryAccum = accum[encoded]
        const children = (parentEntryAccum && parentEntryAccum.children) ||
          (parentEntry && parentEntry.children) ||
          []
        const contextIndexUpdatesNew = !otherContextHasThought ? {
          [encoded]: {
            children: [
              ...children,
              {
                // guard against undefined
                lastUpdated: cx.lastUpdated || timestamp(),
                rank: cx.rank || 0,
                value: thought.value || '',
              }
            ],
            lastUpdated: timestamp(),
          }
        } : {}
        return {
          ...accum,
          ...contextIndexUpdatesNew,
        }
      }, {})

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
