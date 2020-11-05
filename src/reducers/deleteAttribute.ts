import _ from 'lodash'
import { existingThoughtDelete } from '../reducers'
import { hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Deletes an attribute. */
const deleteAtribute = (state: State, { context, key }: { context: Context, key: string }) => {

  if (!context) return state

  const path = rankThoughtsFirstMatch(state, [...context, key])

  return hasChild(state, context, key)
    ? existingThoughtDelete(state, {
      context,
      showContexts: false,
      thoughtRanked: head(path),
    })
    : state
}

export default _.curryRight(deleteAtribute)
