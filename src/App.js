/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents, initState } from './util.js'
import { initFirebase } from './store.js'

(async() => initState())()
initFirebase()
initEvents()

export default App
