import './App.css'
import data from './data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

/**************************************************************
 * Store & Reducer
 **************************************************************/

const maxDepth = 3
const initialState = {
  focus: window.location.pathname.slice(1) || 'root'
}

const appReducer = (state = initialState, action) => {
  return Object.assign({}, state, (({
    'navigate': () => {
      if (action.history !== false) {
        window.history.pushState(state.focus, '', action.to === 'root' ? '/' : action.to)
      }
      return Object.assign({}, state, {
        focus: action.to
      })
    }
  })[action.type] || (() => state))())
}

const store = createStore(appReducer)

/**************************************************************
 * Dispatchers
 **************************************************************/

const navigateToUrl = () => {
  store.dispatch({ type: 'navigate', to: window.location.pathname.slice(1) || 'root', history: false })
}

/**************************************************************
 * Window Events
 **************************************************************/

window.addEventListener('pageshow', navigateToUrl)
window.addEventListener('popstate', navigateToUrl)

/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect(state => ({ focus: state.focus }))(({ focus, dispatch }) =>
  <div className='content'>
    <a className='home' onClick={() => dispatch({ type: 'navigate', to: 'root' })}>🏠</a>
    <Item id={focus} />
  </div>
)

const Item = connect()(({ id, depth=0, dispatch }) => {

  // missing (e.g. due to rendering only a subset of items)
  if (!(id in data)) {
    return <div className={'item container-depth' + depth}>{id}</div>
  }

  const item = data[id]
  return <div className={'item container-depth' + depth}>
    <div className={'depth' + depth}>
      <a onClick={() => dispatch({ type: 'navigate', to: item.id })}>{item.value}</a>
    </div>
    {depth < maxDepth && item.children ? item.children.map((childId, i) => <Item key={i} id={childId} depth={depth + 1}/>)
    : null}
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
