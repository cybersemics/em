import { clientId } from '../browser'
import * as firebaseProvider from '../data-providers/firebase'
import { loadRemoteState } from '../action-creators'
import { ROOT_TOKEN, SCHEMA_LATEST } from '../constants'
import { hashThought, logWithTime, sync } from '../util'

/** Updates local state with newly authenticated user. */
const userAuthenticated = (user, { readyToLoadRemoteState = Promise.resolve() } = {}) => async (dispatch, getState) => {

  const firebase = window.firebase

  // save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  dispatch({ type: 'authenticate', value: true, userRef, user })

  // login automatically on page load
  setTimeout(() => {
    localStorage.autologin = true
  })

  // update user information
  userRef.update({
    name: user.displayName,
    email: user.email
  }, err => {
    if (err) {
      dispatch({ type: 'error', value: err })
      console.error(err)
    }
  })

  // update thoughts
  const thoughts = await firebaseProvider.getDescendantThoughts(user.uid, [ROOT_TOKEN])
  dispatch({
    type: 'updateThoughts',
    contextIndexUpdates: thoughts.contextIndex,
    thoughtIndexUpdates: thoughts.thoughtIndex,
    local: false,
    remote: false,
  })

  dispatch({ type: 'status', value: 'loaded' })

  // need to explicitly re-render since updateThoughts does not necessarily trigger it
  // needs to be delayed till next tick for some reason as well
  setTimeout(() => {
    dispatch({
      type: 'render'
    })
  })

  // load Firebase thoughtIndex,
  // delete existing event handlers just in case, but this should not be an issue any more with the fixes to initFirebase
  userRef.off('value')
  if (!global) {
    userRef.on('value', snapshot => {
      logWithTime('userAuthenticated: Firebase value received')
      const remoteState = snapshot.val()

      dispatch({ type: 'status', value: 'loaded' })

      // ignore updates originating from this client
      if (!remoteState || remoteState.lastClientId === clientId) return

      // init root if it does not exist (i.e. local == false)
      if (!remoteState.thoughtIndex || !remoteState.thoughtIndex[hashThought(ROOT_TOKEN)]) {
        const state = getState()
        sync(state.thoughts.thoughtIndex, state.thoughts.contextIndex, {
          updates: {
            schemaVersion: SCHEMA_LATEST
          }
        })
      }
      // otherwise sync all thoughtIndex locally
      else {

        // convert remote thought structure to local thought structure
        remoteState.thoughts = remoteState.thoughts || {
          contextIndex: remoteState.contextIndex,
          thoughtIndex: remoteState.thoughtIndex,
        }
        delete remoteState.contextIndex // eslint-disable-line fp/no-delete
        delete remoteState.thoughtIndex // eslint-disable-line fp/no-delete

        // wait for loadLocalState to complete, otherwise loadRemoteState will try to repopulate local db with data from the server
        readyToLoadRemoteState.then(() => dispatch(loadRemoteState(remoteState)))
      }
    })
  }
}

export default userAuthenticated
