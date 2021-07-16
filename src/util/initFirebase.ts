import { Store } from 'redux'
import globals from '../globals'
import {
  authenticate,
  loadPublicThoughts,
  setRemoteSearch,
  status as statusActionCreator,
  userAuthenticated,
  getUserInvites,
  getInviteById,
  updateInviteCode,
} from '../action-creators'
import { ALGOLIA_CONFIG, FIREBASE_CONFIG, OFFLINE_TIMEOUT } from '../constants'
import { owner } from '../util'
import { Firebase, State } from '../@types'
import initAlgoliaSearch from '../search/algoliaSearch'

/** Initialize firebase and event handlers. */
export const initFirebase = async ({ store }: { store: Store<State, any> }) => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    // on auth change
    // this is called when the user logs in or the page refreshes when the user is already authenticated
    firebase.auth().onAuthStateChanged((user: Firebase.User) => {
      if (user) {
        store.dispatch(userAuthenticated(user))

        const { invitationCode = '' } = store.getState()

        if (invitationCode !== '') {
          store.dispatch(updateInviteCode(user.uid, invitationCode))
        }

        store.dispatch(getUserInvites(user.uid))

        const { applicationId, index } = ALGOLIA_CONFIG
        const hasRemoteConfig = applicationId && index

        if (!hasRemoteConfig) console.warn('Algolia configs not found. Remote search is not enabled.')
        else initAlgoliaSearch(user.uid, { applicationId, index }, store)
      } else {
        store.dispatch(authenticate({ value: false }))
        store.dispatch(setRemoteSearch({ value: false }))
      }
    })

    // load a public context
    if (owner() !== '~') {
      store.dispatch(loadPublicThoughts())
    }

    // on connect change
    // this is called when moving from online to offline and vice versa
    const connectedRef = firebase.database().ref('.info/connected')
    connectedRef.on('value', async (snapshot: Firebase.Snapshot<boolean>) => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {
        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        // if reconnecting from offline mode, onAuthStateChange is not called since Firebase is still authenticated, but we still need to execute the app authentication logic and subscribe to the main value event
        // if status is loading, we can assume onAuthStateChanged and thus userAuthenticated was already called
        if (status !== 'loading' && firebase.auth().currentUser) {
          await store.dispatch(userAuthenticated(firebase.auth().currentUser))
        }
      }

      // if thoughtIndex was already loaded and we go offline, enter offline mode immediately
      else if (status === 'loaded') {
        store.dispatch(statusActionCreator({ value: 'offline' }))
      }
    })

    const { invitationCode, showModal } = store.getState()

    if (invitationCode !== '' && showModal === 'signup') {
      store.dispatch(getInviteById(invitationCode))
    }
  }

  // before thoughtIndex has been loaded, wait a bit before going into offline mode to avoid flashing the Offline status message
  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch(statusActionCreator({ value: 'offline' }))
  }, OFFLINE_TIMEOUT)
}
