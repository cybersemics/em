import _ from 'lodash'
import { updateThoughts } from '../action-creators'
import { ThoughtUpdates, Thunk } from '../@types'
import { SessionType, getSessionId, getSessionType } from '../util/sessionManager'

interface Updateable {
  updatedBy?: string
}

// /** Checks if the context is visible. */
// const isContextVisible = (state: State, context: Context): boolean => {
//   const expandedContexts = expandThoughts(state, state.cursor, {
//     returnContexts: true,
//   })

//   const visibleContexts = getVisibleContexts(state, expandedContexts)
//   return !!Object.keys(visibleContexts).find(c => equalArrays(visibleContexts[c], context))
// }

// /** If given object is of parent type. */
// const isParent = (parentOrLexeme: Parent | Lexeme): parentOrLexeme is Parent => {
//   return (parentOrLexeme as Parent).context !== undefined
// }

/** Returns true if the updateable entity is coming from the given SessionType and is not self. */
export const isValidSource = (updateable: Updateable, updateType: SessionType) => {
  // if (!parentOrLexeme) return true
  // if (isParent(parentOrLexeme) && !isContextVisible(state, parentOrLexeme.context)) return false
  // else if ('contexts' in parentOrLexeme && !parentOrLexeme.contexts.find(c => isContextVisible(state, c.context)))
  //   return false
  return updateable.updatedBy !== getSessionId() && getSessionType(updateable.updatedBy) === updateType
}

/** Filters out updates from invalid sources (self or wrong SessionType) and updates thoughts. */
const updateThoughtsFromSubscription =
  (updates: ThoughtUpdates, sessionType: SessionType): Thunk =>
  (dispatch, getState) => {
    const state = getState()

    const contextIndexUpdates = _.pickBy(updates.contextIndex, (parent, key) =>
      !parent ? state.thoughts.contextIndex[key] : isValidSource(parent, sessionType),
    )

    const thoughtIndexUpdates = _.pickBy(updates.thoughtIndex, (lexeme, key) =>
      !lexeme ? state.thoughts.thoughtIndex[key] : isValidSource(lexeme, sessionType),
    )

    if (Object.keys(contextIndexUpdates).length === 0 && Object.keys(thoughtIndexUpdates).length === 0) return

    dispatch(
      updateThoughts({
        contextIndexUpdates,
        thoughtIndexUpdates,
        local: false,
        remote: false,
      }),
    )
  }

export default updateThoughtsFromSubscription
