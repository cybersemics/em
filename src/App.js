/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App'
import initDB from './db'
import { store } from './store'

// util
import {
  initEvents,
  initFirebase,
  urlDataSource,
} from './util'

// action-creators
import {
  loadFromUrl,
  loadLocalState,
  preloadSources,
} from './action-creators'

(async () => {

  // load local state
  await initDB()
  const src = urlDataSource()
  const localStateLoaded = store.dispatch(src
    ? loadFromUrl(src)
    : loadLocalState()
  )

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

})()

export default App
