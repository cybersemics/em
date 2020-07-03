/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App'
import initDB, * as db from './db'
import { store } from './store'
import { getContexts, getThought, getThoughts, getThoughtsRanked } from './selectors'

// util
import {
  hashContext,
  hashThought,
  initEvents,
  initFirebase,
  owner,
  urlDataSource,
} from './util'

// action-creators
import {
  loadFromUrl,
  loadLocalState,
  preloadSources,
} from './action-creators'

// export the promise for testing
export const initialized = (async () => {

  // load local state unless loading a public context or source url
  await initDB()
  const src = urlDataSource()
  const localStateLoaded = owner() === '~'
    // authenticated or offline user
    ? store.dispatch(src
      ? loadFromUrl(src)
      : loadLocalState())
    // other user context
    : Promise.resolve()

  // load =preload sources
  localStateLoaded.then(() => {
    // extra delay for good measure to not block rendering
    setTimeout(() => {
      store.dispatch(preloadSources)
    }, 500)
  })

  // allow initFirebase to start the authentication process, but pass the localStateLoaded promise so that loadRemoteState will wait, otherwise it will try to repopulate local db with data from the remote
  initFirebase({ readyToLoadRemoteState: localStateLoaded })

  // initialize window events
  initEvents()

  return localStateLoaded

})()

/** Partially apply state to a function. */
const withState = f => (...args) => f(store.getState(), ...args)

// add objects to window for debugging
window.em = {
  db,
  store,
  getContexts: withState(getContexts),
  getThought: withState(getThought),
  getThoughts: withState(getThoughts),
  getThoughtsRanked: withState(getThoughtsRanked),
  hashContext,
  hashThought,
}

export default App
