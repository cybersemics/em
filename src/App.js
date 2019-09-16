import './App.css'

// components
import { App } from './components/App.js'

// util
import {
  initEvents,
  initFirebase,
} from './util.js'

initFirebase()
initEvents()

export default App
