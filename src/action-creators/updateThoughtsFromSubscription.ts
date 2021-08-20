import { updateThoughts } from '../action-creators'
import { SubscriptionUpdate, ThoughtSubscriptionUpdates, Thunk } from '../@types'
import { SessionType, getSessionId, getSessionType } from '../util/sessionManager'
import { keyValueBy } from '../util'

interface Updateable {
  updatedBy?: string
}

/** Returns true if the updateable entity is coming from the given SessionType and is not self. */
const isValidSource = <T extends Updateable>(update: SubscriptionUpdate<T>, updateType: SessionType) => {
  // updatedBy may be stored on the object (Firebase) or passed through from the transaction object (Dexie).
  // This is needed since deletes have no object to store updatedBy.
  const updatedBy = update.updatedBy || update.value?.updatedBy

  // on a change event, the firebase snapshot only contains updated fields, which may not include updatedBy
  // in this case, return true so it gets added locally
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
      isValidSource(parentUpdate, sessionType)
        ? {
            [key]: parentUpdate.value,
          }
        : null,
    )

    const thoughtIndexUpdates = keyValueBy(updates.thoughtIndex, (key, lexemeUpdate) =>
      isValidSource(lexemeUpdate, sessionType)
        ? {
            [key]: lexemeUpdate.value,
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
