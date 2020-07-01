import { store } from '../store'
import globals from '../globals'
import { loadPublicThoughts, userAuthenticated } from '../action-creators'
import { FIREBASE_CONFIG, OFFLINE_TIMEOUT } from '../constants'
import { owner } from '../util'

/** Initialize firebase and event handlers. */
export const initFirebase = async ({ readyToLoadRemoteState }: {readyToLoadRemoteState?: Promise<void>} = {}) => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    // on auth change
    // this is called when the user logs in or the page refreshes when the user is already authenticated
    firebase.auth().onAuthStateChanged(async (user: any) => {
      if (user) {
        store.dispatch(userAuthenticated(user, { readyToLoadRemoteState }))
      }
      else {
        store.dispatch({ type: 'authenticate', value: false })
      }
    })

    // load a public context
    if (owner() !== '~') {
      store.dispatch(loadPublicThoughts())
    }

    // on connect change
    // this is called when moving from online to offline and vice versa
    const connectedRef = firebase.database().ref('.info/connected')
    connectedRef.on('value', async (snapshot: { val: () => any }) => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        // if reconnecting from offline mode, onAuthStateChange is not called since Firebase is still authenticated, but we still need to execute the app authentication logic and subscribe to the main value event
        // if status is loading, we can assume onAuthStateChanged and thus userAuthenticated was already called
        if (status !== 'loading' && firebase.auth().currentUser) {
          await store.dispatch(userAuthenticated(firebase.auth().currentUser, { readyToLoadRemoteState }))
        }
      }

      // if thoughtIndex was already loaded and we go offline, enter offline mode immediately
      else if (status === 'loaded') {
        store.dispatch({ type: 'status', value: 'offline' })
      }
    })
  }

  // before thoughtIndex has been loaded, wait a bit before going into offline mode to avoid flashing the Offline status message
  // @ts-ignore
  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch({ type: 'status', value: 'offline' })
  }, OFFLINE_TIMEOUT)
}
