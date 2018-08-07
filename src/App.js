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
  focus: [window.location.pathname.slice(1) || 'root']
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
  store.dispatch({ type: 'navigate', to: [window.location.pathname.slice(1) || 'root'], history: false })
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
    <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}>🏠</a>
    <Context items={focus} />
  </div>
)

const Context = connect()(({ items, depth=0, dispatch }) => {

  // missing (e.g. due to rendering only a subset of items)
  // if (!(id in data)) {
  //   return <div className={'item missing container-depth' + depth}>{id}</div>
  // }

  // returns true if a is a strict super set of b
  // const superSet = (a, b) => b.length > 0 && b.every(itemB => a.includes(itemB))
  // TODO: figure out superset so that e.g. a context of "Maiden + Todo" shows "Maiden + Todo + Raine"
  const deepEqual = (a, b) =>
    a.every(itemA => b.includes(itemA)) &&
    b.every(itemB => a.includes(itemB))

  // generate children from all items (not built for performance)
  const children = Object.keys(data).filter(key =>
    data[key].memberOf.some(memberSet => deepEqual(items, memberSet))
  )

  const root = items[0] === 'root'

  return <div className={'item container-depth' + depth}>
    {!root ? <div className={'depth' + depth}>
      <a onClick={() => dispatch({ type: 'navigate', to: items })}>
        <span>{items[items.length - 1]}</span>
        { /* intersections */
        depth === 0 && items.length > 1 ? <span className='missing'> + {items.slice(0, items.length - 1).join(' + ')}</span> : null}
      </a>
    </div> : null}
    {depth < maxDepth ? children.map((childValue, i) => <Context key={i} items={(root ? [] : items).concat(childValue)} depth={depth + (root ? 0 : 1)}/>)
    : null}
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
