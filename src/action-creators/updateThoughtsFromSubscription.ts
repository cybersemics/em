import _ from 'lodash'
import { updateThoughts } from '../action-creators'
import { ThoughtUpdates, Thunk } from '../@types'
import { SessionType, getSessionId, getSessionType } from '../util/sessionManager'

interface Updateable {
  updatedBy?: string
}

/** Returns true if the updateable entity is coming from the given SessionType and is not self. */
export const isValidSource = (updateable: Updateable, updateType: SessionType) => {
  // on a change event, the firebase snapshot only contains updated fields, which may not include updatedBy
  // in this case, return true so it gets added locally
  return (
    !updateable.updatedBy ||
    (updateable.updatedBy !== getSessionId() && getSessionType(updateable.updatedBy) === updateType)
  )
}

/** Filters out updates from invalid sources (self or wrong SessionType) and updates thoughts. */
const updateThoughtsFromSubscription =
  (updates: ThoughtUpdates, sessionType: SessionType): Thunk =>
  (dispatch, getState) => {
    const state = getState()

    const contextIndexUpdates = _.pickBy(updates.contextIndex, (parent, key) =>
      !parent ? key in state.thoughts.contextIndex : isValidSource(parent, sessionType),
    )

    const thoughtIndexUpdates = _.pickBy(updates.thoughtIndex, (lexeme, key) =>
      !lexeme ? key in state.thoughts.thoughtIndex : isValidSource(lexeme, sessionType),
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
