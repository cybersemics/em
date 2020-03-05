import { clientId } from '../browser.js'
import { store } from '../store.js'
import loadRemoteState from '../action-creators/loadRemoteState.js'
import {
  ROOT_TOKEN,
  SCHEMA_LATEST,
} from '../constants.js'

// util
import { sync } from './sync.js'
import { hashThought } from './hashThought.js'

/** Updates local state with newly authenticated user. */
export const userAuthenticated = user => {

  const firebase = window.firebase

  // save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  store.dispatch({ type: 'authenticate', value: true, userRef, user })

  // once authenticated, login automatically on page load
  store.dispatch({ type: 'settings', key: 'Autologin', value: 'On', remote: false })

  // update user information
  userRef.update({
    name: user.displayName,
    email: user.email
  }, err => {
    if (err) {
      store.dispatch({ type: 'error', value: err })
      console.error(err)
    }
  })

  // load Firebase thoughtIndex
  // TODO: Prevent userAuthenticated from being called twice in a row to avoid having to detach the value handler
  userRef.off('value')
  userRef.on('value', snapshot => {
    const remoteState = snapshot.val()

    store.dispatch({ type: 'status', value: 'loaded' })

    // ignore updates originating from this client
    if (!remoteState || remoteState.lastClientId === clientId) return

    // init root if it does not exist (i.e. local == false)
    if (!remoteState.thoughtIndex || !remoteState.thoughtIndex[hashThought(ROOT_TOKEN)]) {
      const state = store.getState()
      sync(state.thoughtIndex, state.contextIndex, {
        updates: {
          schemaVersion: SCHEMA_LATEST
        }
      })
    }
    // otherwise sync all thoughtIndex locally
    else {
      loadRemoteState(remoteState)
    }
  })
}
