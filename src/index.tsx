import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './components/App'
import './index.css'
import { initialize } from './initialize'

initialize()

ReactDOM.render(<App />, document.getElementById('root'))
