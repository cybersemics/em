import _ from 'lodash'
import { Thunk, Path, ThoughtContext } from '../@types'

// util
import {
  parentOf,
  equalArrays,
  equalThoughtRanked,
  equalThoughtValue,
  hashContext,
  hashThought,
  head,
  headRank,
  headValue,
  pathToContext,
  timestamp,
  unroot,
} from '../util'

// selectors
import {
  getAllChildren,
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
    const thoughtRanked = head(path)
    const value = headValue(path)
    const rank = headRank(path)
    const context = pathToContext(path)
    const encoded = hashContext(context)
    const lexeme = getLexeme(state, value)
    const pathContext = parentOf(context)
    const simplePath = simplifyPath(state, path)

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
              context,
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
        const childExists = hasLexeme(state, child.value)
        if (!childExists) {
          console.warn('Recreating missing lexeme in thoughtIndex:', child.value)
          dispatch({
            type: 'createThought',
            context,
            // guard against undefined
            rank: child.rank || 0,
            value: child.value || '',
          })
          return
        }
      }
    }

    if (lexeme && lexeme.contexts) {
      // recreate thoughts missing in lexeme.contexts
      if (recreateMissingThoughtContexts) {
        const matchingThoughtInContexts = lexeme.contexts.find(
          cx => cx.context && equalArrays(unroot(cx.context), pathContext),
        )
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
          const otherContextChildren = getAllChildren(state, cx.context)
          const otherContextHasThought = otherContextChildren.some(
            child => hashThought(child.value) === hashThought(lexeme.value) && child.rank === cx.rank,
          )
          const encoded = hashContext(cx.context)
          const parentEntry = contextIndex[encoded]
          const parentEntryAccum = accum[encoded]
          const children =
            (parentEntryAccum && parentEntryAccum.children) || (parentEntry && parentEntry.children) || []
          const contextIndexUpdatesNew = !otherContextHasThought
            ? {
                [encoded]: {
                  id: encoded,
                  context: cx.context,
                  children: [
                    ...children,
                    {
                      // guard against undefined
                      id: hashContext(unroot([...cx.context, lexeme.value || ''])),
                      lastUpdated: cx.lastUpdated || timestamp(),
                      rank: cx.rank || 0,
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
          rootedParentOf(state, pathToContext(simplePath)),
        ).filter(equalThoughtValue(value))

        if (contextIndexThoughtsMatchingValue.length > 0) {
          const thoughtsMatchingValueAndRank = contextIndexThoughtsMatchingValue.filter(child =>
            equalThoughtRanked(thoughtRanked, child),
          )
          if (thoughtsMatchingValueAndRank.length === 0) {
            const contextIndexRank = contextIndexThoughtsMatchingValue[0].rank
            const thoughtEncoded = hashThought(value)

            // change rank in thoughtIndex to that from contextIndex
            console.warn('Syncing divergent ranks:', value)
            dispatch({
              type: 'updateThoughts',
              thoughtIndexUpdates: {
                [thoughtEncoded]: {
                  ...lexeme,
                  contexts: lexeme.contexts.map(parent =>
                    equalArrays(unroot(parent.context), pathContext)
                      ? {
                          ...parent,
                          rank: contextIndexRank,
                        }
                      : parent,
                  ),
                },
              },
            })
          }
        }
      }
    }
  }

export default dataIntegrityCheck
