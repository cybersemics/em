/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents, initFirebase, loadLocalState } from './util.js'
import initDB from './db'

(async () => {

  // load local state
  const localStateLoaded = loadLocalState()

  // allow initFirebase to start the authentication process, but pass the localStateLoaded promise so that loadRemoteState will wait, otherwise it will try to repopulate localForage with data from the remote
  initFirebase({ readyToLoadRemoteState: localStateLoaded })

  // initialize window events
  initEvents()

})()

export default App
