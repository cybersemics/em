import { updateThoughts } from '../action-creators'
import { State, SubscriptionUpdate, ThoughtSubscriptionUpdates, Thunk } from '../@types'
import { SessionType, getSessionId, getSessionType } from '../util/sessionManager'
import { keyValueBy } from '../util'

interface Updateable {
  // used to look up the object in the Redux state when only receiving updated fields
  id?: string
  updatedBy?: string
}

/** Returns true if the updateable entity is coming from the given SessionType and is not self. */
const isValidSource = <T extends Updateable>(state: State, update: SubscriptionUpdate<T>, updateType: SessionType) => {
  const updatedBy =
    // updatedBy may be passed  from the transaction object (Dexie).
    // This is needed since deletes have no object to store updatedBy.
    update.updatedBy ||
    // updatedBy may be stored on the object itself (Firebase)
    update.value?.updatedBy ||
    // updatedBy may not have changed, and thus is not included in the child_changed snapshot.
    // In this case updatedBy from Redux state.
    (update.value ? state.thoughts.contextIndex[update.value.id!]?.updatedBy : null) ||
    (update.value ? state.thoughts.thoughtIndex[update.value.id!]?.updatedBy : null)

  // on a change event, the firebase snapshot only contains updated fields, which may not include updatedBy
  // if we don't have the record in Redux state, return true so it gets added
  return !updatedBy || (updatedBy !== getSessionId() && getSessionType(updatedBy) === updateType)
}

/** Filters out updates from invalid sources (self or wrong SessionType) and updates thoughts. */
const updateThoughtsFromSubscription =
  (updates: ThoughtSubscriptionUpdates, sessionType: SessionType): Thunk =>
  (dispatch, getState) => {
    // disable local subscription when the user is logged in
    // otherwise they will receive subscription updates from both local and remote
    const state = getState()
    if (state.status === 'loaded' && sessionType === SessionType.LOCAL) return

    const contextIndexUpdates = keyValueBy(updates.contextIndex, (key, parentUpdate) =>
      isValidSource(state, parentUpdate, sessionType)
        ? {
            // merge partial Parent from update with Redux Parent
            // TODO: Fix Updateable type to indicate that all fields are optional
            [key]: parentUpdate.value
              ? { ...state.thoughts.contextIndex[parentUpdate.value.id!], ...parentUpdate.value }
              : parentUpdate.value,
          }
        : null,
    )

    const thoughtIndexUpdates = keyValueBy(updates.thoughtIndex, (key, lexemeUpdate) =>
      isValidSource(state, lexemeUpdate, sessionType)
        ? {
            // merge partial Lexeme from update with Redux Lexeme
            // TODO: Fix Updateable type to indicate that all fields are optional
            [key]: lexemeUpdate.value
              ? { ...state.thoughts.thoughtIndex[lexemeUpdate.value.id!], ...lexemeUpdate.value }
              : lexemeUpdate.value,
          }
        : null,
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
