/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react'
import { Provider, connect } from 'react-redux'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import * as evaluate from 'static-eval'
import * as htmlparser from 'htmlparser2'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

import './App.css'
import { clientId, isMac, isMobile } from './browser.js'
import { initialState, store } from './store.js'

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
