import { getSessionId, getSessionType, SessionType } from './sessionManager'
import { updateThoughts } from '../action-creators'

import { expandThoughts, getVisibleContexts } from '../selectors'
import { equalArrays } from './equalArrays'
import { State } from './initialState'
import { Parent, Index, Lexeme, Context, Thunk } from '../types'

export interface Updates {
  thoughtIndexUpdates?: Index<Lexeme | null>
  contextIndexUpdates?: Index<Parent | null>
}

/** Checks if the context is visible. */
const isContextVisible = (state: State, context: Context): boolean => {
  const expandedContexts = expandThoughts(state, state.cursor, {
    returnContexts: true,
  })

  const visibleContexts = getVisibleContexts(state, expandedContexts)
  return !!Object.keys(visibleContexts).find(c => equalArrays(visibleContexts[c], context))
}
/** If given object is of parent type. */
const isParent = (parentOrLexeme: Parent | Lexeme): parentOrLexeme is Parent => {
  return (parentOrLexeme as Parent).context !== undefined
}

/** Filter self triggered updates. */
export const shouldIncludeUpdate = (state: State, parentOrLexeme?: Parent | Lexeme, updateType?: SessionType) => {
  if (!parentOrLexeme) return true
  if (isParent(parentOrLexeme) && !isContextVisible(state, parentOrLexeme.context)) return false
  else if ('contexts' in parentOrLexeme && !parentOrLexeme.contexts.find(c => isContextVisible(state, c.context)))
    return false
  return parentOrLexeme.updatedBy !== getSessionId() && getSessionType(parentOrLexeme.updatedBy) === updateType
}

/** An action-creator to update the thought from a subscription trigger. */
export const updateThoughtsFromSubscription =
  (updates: Updates): Thunk =>
  (dispatch, getState) => {
    if (
      Object.keys(updates.thoughtIndexUpdates || {}).length === 0 &&
      Object.keys(updates.contextIndexUpdates || {}).length === 0
    )
      return

    dispatch(
      updateThoughts({
        ...updates,
        contextIndexUpdates: updates.contextIndexUpdates || {},
        thoughtIndexUpdates: updates.thoughtIndexUpdates || {},
        local: false,
        remote: false,
      }),
    )
  }
