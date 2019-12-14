import { clientId } from '../browser.js'
import { store } from '../store.js'
import {
  ROOT_TOKEN,
  SCHEMA_LATEST,
} from '../constants.js'

// util
import { sync } from './sync.js'
import { hashThought } from './hashThought.js'

/** Updates local state with newly authenticated user. */
export const userAuthenticated = async (user) => {

  const firebase = window.firebase

  // save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  store.dispatch({ type: 'authenticate', value: true, userRef, user })

  // once authenticated, login automatically on page load
  store.dispatch({ type: 'settings', key: 'autologin', value: true, remote: false })

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

  // load Firebase data
  // TODO: Prevent userAuthenticated from being called twice in a row to avoid having to detach the value handler
  userRef.off('value')
  userRef.on('value', snapshot => {
    const value = snapshot.val()

    store.dispatch({ type: 'status', value: 'loaded' })

    // ignore updates originating from this client
    if (!value || value.lastClientId === clientId) return

    // init root if it does not exist (i.e. local == false)
    // must check root keys for all possible schema versions
    if (!value.data || (
      !value.data.root &&
      !value.data[ROOT_TOKEN] &&
      !value.data[hashThought(ROOT_TOKEN)]
    )) {
      const state = store.getState()
      sync(state.data, state.contextChildren, {
        updates: {
          schemaVersion: SCHEMA_LATEST
        }
      })
    }
    // otherwise sync all data locally
    else {
      fetch(value)
    }
  })
}
