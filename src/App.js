import './App.css'
import sampleData from './sample-data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

/**************************************************************
 * Store & Reducer
 **************************************************************/

const maxDepth = 3
const maxHistory = 100
const initialState = {
  focus: window.location.pathname.slice(1) || 'root'
}

const appReducer = (state = initialState, action) => {
  console.log('DISPATCH', action)
  switch(action.type) {
    case 'navigate':
      let localHistory = JSON.parse(localStorage.history || '[]')

      // cap length of history
      if (localHistory.length > maxHistory) {
        localHistory = localHistory.slice(maxHistory)
      }

      // push to local history
      localStorage.history = JSON.stringify(localHistory.concat(action.to))
      if (action.history !== false) {
        window.history.pushState(state.focus, '', action.to === 'root' ? '' : action.to)
      }
      return Object.assign({}, state, {
        focus: action.to
      })
    default:
      return state
  }
}

const store = createStore(appReducer)

/**************************************************************
 * Window Events
 **************************************************************/

window.addEventListener('pageshow', navigateToUrl)
window.addEventListener('popstate', navigateToUrl)

/**************************************************************
 * Dispatchers
 **************************************************************/

const navigateToUrl = () => {
  store.dispatch({ type: 'navigate', to: window.location.pathname.slice(1) || 'root', history: false })
}

/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect(state => ({ focus: state.focus }))(({ focus, dispatch }) =>
  <div className='content'>
    <Item id={focus} />
    <div className='keyboard' />
  </div>
)

const Item = connect()(({ id, depth=0, dispatch }) => {
  const data = sampleData[id]
  return <div className={'item container-depth' + depth}>
    <div className={'depth' + depth}>
      <a onClick={() => dispatch({ type: 'navigate', to: data.id })}>{data.value}</a>
    </div>
    {depth < maxDepth ? data.children.map(childId => <Item key={childId} id={childId} depth={depth + 1}/>)
    : null}
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
