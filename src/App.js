/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents } from './util.js'
import { initFirebase } from './store-utils.js'

initFirebase()
initEvents()

export default App
