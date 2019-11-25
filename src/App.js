/** All must enter here!!! The entrypoint for the app. */

import './App.css'
import { App } from './components/App.js'
import { initEvents } from './util.js'
import { initFirebase } from './store.js'
import { initState } from './util.js'

(async()=>initState())();
initFirebase()
initEvents()

export default App
