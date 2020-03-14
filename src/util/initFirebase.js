import { store } from '../store.js'
import globals from '../globals.js'

// constants
import {
  FIREBASE_CONFIG,
  OFFLINE_TIMEOUT,
} from '../constants.js'

// util
import { userAuthenticated } from './userAuthenticated.js'

/** Initialize firebase and event handlers. */
export const initFirebase = async ({ readyToLoadRemoteState } = {}) => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    // on auth change
    // this is called when the user logs in or the page refreshes when the user is already authenticated
    firebase.auth().onAuthStateChanged(async user => {
      if (user) {
        userAuthenticated(user, { readyToLoadRemoteState })
      }
      else {
        store.dispatch({ type: 'authenticate', value: false })
      }
    })

    // on connect change
    // this is called when moving from online to offline and vice versa
    const connectedRef = firebase.database().ref('.info/connected')
    connectedRef.on('value', async snapshot => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        // if reconnecting from offline mode, onAuthStateChange is not called since Firebase is still authenticated, but we still need to execute the app authentication logic and subscribe to the main value event
        // if status is loading, we can assume onAuthStateChanged and thus userAuthenticated was already called
        if (status !== 'loading' && firebase.auth().currentUser) {
          await userAuthenticated(firebase.auth().currentUser, { readyToLoadRemoteState })
        }
      }

      // if thoughtIndex was already loaded and we go offline, enter offline mode immediately
      else if (status === 'loaded') {
        store.dispatch({ type: 'status', value: 'offline' })
      }
    })
  }

  // before thoughtIndex has been loaded, wait a bit before going into offline mode to avoid flashing the Offline status message
  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch({ type: 'status', value: 'offline' })
  }, OFFLINE_TIMEOUT)
}
