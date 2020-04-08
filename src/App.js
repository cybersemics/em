/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App'
import initDB from './db'
import loadFromUrl from './action-creators/loadFromUrl'

import {
  initEvents,
  initFirebase,
  loadLocalState,
  urlDataSource,
} from './util'

(async () => {

  // load local state
  await initDB()
  const src = urlDataSource()
  const localStateLoaded = src
    ? loadFromUrl(src)
    : loadLocalState()

  // allow initFirebase to start the authentication process, but pass the localStateLoaded promise so that loadRemoteState will wait, otherwise it will try to repopulate local db with data from the remote
  initFirebase({ readyToLoadRemoteState: localStateLoaded })

  // initialize window events
  initEvents()

})()

export default App
