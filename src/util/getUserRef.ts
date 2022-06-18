import * as Firebase from '../@types/Firebase'
import State from '../@types/State'

/**
 * Get the user ref from an authenticated user's details stored in the state.
 */
export const getUserRef = (state: State): Firebase.Ref<Firebase.User> | null =>
  state.user?.uid ? window.firebase?.database().ref('users/' + state.user.uid) : null

// do not export default so that the firebase tests can mock getUserRef
// TODO: How to mock non-default export?
