import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import { App } from './components/App'
import registerServiceWorker from './registerServiceWorker'
import { initialize } from './initialize'

initialize()

ReactDOM.render(<App />, document.getElementById('root'))
registerServiceWorker()
