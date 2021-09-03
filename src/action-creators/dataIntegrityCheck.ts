import _ from 'lodash'
import { Thunk, Path, ThoughtContext } from '../@types'

// util
import { parentOf, equalThoughtValue, hashThought, head, pathToContext, timestamp, headId } from '../util'

// selectors
import {
  getChildrenRanked,
  getLexeme,
  getSetting,
  hasLexeme,
  rootedParentOf,
  simplifyPath,
  splitChain,
} from '../selectors'

const disableAll = true
const deleteDuplicateContextIndex = true
const recreateMissingContextIndex = true
const recreateMissingThoughtIndex = true
const recreateMissingThoughtContexts = true
const syncDivergentRanks = true

// @MIGRATION_TODO: Logic has not been fixed properly.
/** Performs a data integrity check and is able to fix minor problems with thoughtIndex and contextIndex being out of sync. */
const dataIntegrityCheck =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    if (disableAll) return

    const state = getState()

    if (getSetting(state, 'Data Integrity Check') !== 'On' || !path) return

    // do not perform Data Integrity Check within context view otherwise chaos will ensue
    if (splitChain(state, path).length > 1) return

    const contextIndex = state.thoughts.contextIndex ?? {}

    const thought = state.thoughts.contextIndex[head(path)]
    const { rank, value } = thought
    const context = pathToContext(state, path)
    const encoded = headId(path)
    const lexeme = getLexeme(state, value)
    const pathContext = parentOf(context)
    const simplePath = simplifyPath(state, path)

    const thoughtId = headId(path)

    // delete duplicate thoughts in contextIndex
    if (deleteDuplicateContextIndex) {
      const parentEntry = contextIndex[encoded]
      const children = (parentEntry || {}).children || []
      const childrenUnique = _.uniqBy(children, child => {
        const thought = state.thoughts.contextIndex[child]
        return thought.value + '__SEP' + thought.rank
      })
      if (parentEntry && childrenUnique.length < children.length) {
        console.warn('Deleting duplicate thoughts in contextIndex:', value)
        dispatch({
          type: 'updateThoughts',
          contextIndexUpdates: {
            [encoded]: {
              children: childrenUnique,
              lastUpdated: parentEntry.lastUpdated,
            },
          },
        })

        return
      }
    }

    // recreate thoughts missing in thoughtIndex
    if (recreateMissingThoughtIndex) {
      const children = (contextIndex[encoded] || {}).children || []
      // eslint-disable-next-line fp/no-loops,fp/no-let
      for (const child of children) {
        const thought = state.thoughts.contextIndex[child]
        const childExists = hasLexeme(state, thought.value)
        if (!childExists) {
          console.warn('Recreating missing lexeme in thoughtIndex:', thought.value)
          dispatch({
            type: 'createThought',
            context,
            // guard against undefined
            rank: thought.rank || 0,
            value: thought.value || '',
          })
          return
        }
      }
    }

    if (lexeme && lexeme.contexts) {
      // recreate thoughts missing in lexeme.contexts
      if (recreateMissingThoughtContexts) {
        const matchingThoughtInContexts = lexeme.contexts.find(cx => cx === thoughtId)
        if (!matchingThoughtInContexts) {
          console.warn('Recreating missing lexeme in lexeme.contexts:', path)
          dispatch({
            type: 'createThought',
            context: pathContext,
            rank,
            value,
          })
        }
      }

      // recreate thoughts missing in contextIndex
      // const contextSubthoughts = getChildrenRanked(state, pathContext)
      if (recreateMissingContextIndex) {
        const contextIndexUpdates = lexeme.contexts.reduce((accum: any, cx: ThoughtContext) => {
          const otherContextChildren = state.thoughts.contextIndex[cx].children
          const contextThought = state.thoughts.contextIndex[cx]

          const otherContextHasThought = otherContextChildren.some(child => {
            const thought = state.thoughts.contextIndex[child]
            return hashThought(thought.value) === hashThought(lexeme.value) && thought.rank === contextThought.rank
          })
          const encoded = cx
          const parentEntry = contextIndex[encoded]
          const parentEntryAccum = accum[encoded]
          const children =
            (parentEntryAccum && parentEntryAccum.children) || (parentEntry && parentEntry.children) || []
          const contextIndexUpdatesNew = !otherContextHasThought
            ? {
                [encoded]: {
                  id: encoded,
                  children: [
                    ...children,
                    {
                      // guard against undefined
                      id: cx,
                      lastUpdated: contextThought.lastUpdated || timestamp(),
                      rank: contextThought.rank || 0,
                      value: lexeme.value || '',
                    },
                  ],
                  lastUpdated: timestamp(),
                },
              }
            : {}
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
          })
        }
        return
      }

      // sync divergent ranks
      if (syncDivergentRanks) {
        const contextIndexThoughtsMatchingValue = getChildrenRanked(
          state,
          rootedParentOf(state, pathToContext(state, simplePath)),
        ).filter(equalThoughtValue(value))

        if (contextIndexThoughtsMatchingValue.length > 0) {
          const thoughtsMatchingValueAndRank = contextIndexThoughtsMatchingValue.filter(
            thought => thought.id === thoughtId,
          )
          if (thoughtsMatchingValueAndRank.length === 0) {
            // const contextIndexRank = contextIndexThoughtsMatchingValue[0].rank
            const thoughtEncoded = hashThought(value)

            // change rank in thoughtIndex to that from contextIndex
            console.warn('Syncing divergent ranks:', value)
            dispatch({
              type: 'updateThoughts',
              thoughtIndexUpdates: {
                [thoughtEncoded]: {
                  ...lexeme,
                },
              },
            })
          }
        }
      }
    }
  }

export default dataIntegrityCheck
