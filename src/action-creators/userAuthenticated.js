import { clientId } from '../browser'

// constants
import {
  ROOT_TOKEN,
  SCHEMA_LATEST,
} from '../constants'

// util
import {
  hashThought,
  sync,
} from '../util'

// action-creators
import error from '../action-creators/error'
import loadRemoteState from '../action-creators/loadRemoteState'

/** Updates local state with newly authenticated user. */
const userAuthenticated = (user, { readyToLoadRemoteState = Promise.resolve() } = {}) => (dispatch, getState) => {

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
      dispatch(error(err))
      console.error(err)
    }
  })

  // load Firebase thoughtIndex,
  // delete existing event handlers just in case, but this should not be an issue any more with the fixes to initFirebase
  userRef.off('value')
  userRef.on('value', snapshot => {
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

export default userAuthenticated
