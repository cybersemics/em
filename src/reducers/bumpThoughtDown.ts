import _ from 'lodash'
import { existingThoughtChange, existingThoughtMove, newThoughtSubmit, setCursor, subCategorizeOne } from '../reducers'
import { getPrevRank, getRankBefore, getThoughts, simplifyPath } from '../selectors'
import { contextOf, headValue, pathToContext, reducerFlow, rootedContextOf, unroot } from '../util'
import { State } from '../util/initialState'
import { Path, SimplePath } from '../types'

/** Clears a thought's text, moving it to its first child. */
const bumpThoughtDown = (state: State, { simplePath }: { simplePath?: SimplePath }) => {

  if (!simplePath && !state.cursor) return

  simplePath = simplePath || simplifyPath(state, state.cursor!)
  const value = headValue(simplePath)

  // const rank = headRank(simplePath)
  const context = pathToContext(simplePath)
  const children = getThoughts(state, context)

  // if there are no children
  if (children.length === 0) return subCategorizeOne(state)

  // TODO: Resolve simplePath to make it work within the context view
  // Cannot do this without the contextChain
  // Need to store the full simplePath of each simplePath segment in the simplePath
  const parentPath = unroot(contextOf(simplePath))

  // modify the rank to get the thought to re-render (via the Subthoughts child key)
  // this should be fixed
  const simplePathWithNewRank: SimplePath = [...parentPath, { value, rank: getRankBefore(state, simplePath) }] as SimplePath
  const simplePathWithNewRankAndValue: Path = [...parentPath, { value: '', rank: getRankBefore(state, simplePath) }]

  return reducerFlow([

    // modify the rank to get the thought to re-render (via the Subthoughts child key)
    existingThoughtMove({
      oldPath: simplePath,
      newPath: simplePathWithNewRank,
    }),

    // clear text
    existingThoughtChange({
      oldValue: value,
      newValue: '',
      context: rootedContextOf(context),
      thoughtsRanked: simplePathWithNewRank
    }),

    // new thought
    state => {
      // the context of the new empty thought
      const contextEmpty = pathToContext(simplePathWithNewRankAndValue as Path)
      return newThoughtSubmit(state, {
        context: contextEmpty,
        rank: getPrevRank(state, contextEmpty),
        value,
      })
    },

    // set cursor
    setCursor({
      thoughtsRanked: simplePathWithNewRankAndValue,
    }),

  ])(state)
}

export default _.curryRight(bumpThoughtDown)
