import { clone, setWith } from 'lodash'

import { getSessionId, getSessionType, SessionType } from './sessionManager'
import { updateThoughts } from '../action-creators'

import { Parent, Index, Lexeme, Context } from '../types'
import { expandThoughts, getVisibleContexts } from '../selectors'
import { equalArrays } from './equalArrays'
import { Action, Store } from 'redux'
import { State } from './initialState'

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
const isParent = (thoughtOrContext: Parent | Lexeme): thoughtOrContext is Parent => {
  return (thoughtOrContext as Parent).context !== undefined
}

/** Util functions for data-provider subscriptions. */
export const getSubscriptionUtils = ({ getState, dispatch }: Store<State, Action<string>>) => ({
  /** Filter self triggered updates. */
  shouldIncludeUpdate: (thoughtOrContext?: Parent | Lexeme, updateType?: SessionType) => {
    const state = getState()
    if (!thoughtOrContext) return true
    if (isParent(thoughtOrContext) && !isContextVisible(state, thoughtOrContext.context)) return false
    else if ('contexts' in thoughtOrContext && !thoughtOrContext.contexts.find(c => isContextVisible(state, c.context)))
      return false
    return thoughtOrContext.updatedBy !== getSessionId() && getSessionType(thoughtOrContext.updatedBy) === updateType
  },

  /** Get object merged with path updates. */
  getUpdatedObject: <T extends Index>(original: T, pathUpdates: Index) =>
    Object.keys(pathUpdates).reduce((acc, key) => {
      return setWith(clone(acc), key, pathUpdates[key], clone)
    }, original),

  /** Get local value of thought from state. */
  getThoughtLocal: (id: string) => {
    const state = getState()
    return state.thoughts.thoughtIndex[id]
  },

  /** Get local value of context from state. */
  getContextLocal: (id: string) => {
    const state = getState()
    return state.thoughts.contextIndex[id]
  },
  updateThoughtsFromSubscription: (updates: Updates) => {
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
  },
})
