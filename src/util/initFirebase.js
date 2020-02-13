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
export const initFirebase = async () => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    firebase.auth().onAuthStateChanged(async user => {
      if (user) {
        userAuthenticated(user)
      }
      else {
        store.dispatch({ type: 'authenticate', value: false })
      }
    })

    const connectedRef = firebase.database().ref('.info/connected')
    connectedRef.on('value', async snapshot => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        if (firebase.auth().currentUser) {
          await userAuthenticated(firebase.auth().currentUser)
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
