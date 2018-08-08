import './App.css'
import data from './data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

const SEP = '|SEPARATOR_TOKEN|'
const URL_SEP = '_→_'
const maxDepth = 3

/**************************************************************
 * Helpers
 **************************************************************/

// returns true if a is a strict super set of b
const superSet = (a, b) => b.length > 0 && b.every(itemB => a.includes(itemB))

// TODO: figure out superset so that e.g. a context of "Maiden + Todo" shows "Maiden + Todo + Raine"
const deepEqual = (a, b) =>
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB))

const getItemsFromUrl = () => {
  const urlComponent = window.location.pathname.slice(1)
  return urlComponent ? window.decodeURI(urlComponent).split(URL_SEP) : ['root']
}

/**************************************************************
 * Store & Reducer
 **************************************************************/

const initialState = {
  focus: getItemsFromUrl()
}

const appReducer = (state = initialState, action) => {
  return Object.assign({}, state, (({
    'navigate': () => {
      if (action.history !== false) {
        window.history.pushState(state.focus, '', deepEqual(action.to, ['root']) ? '/' : action.to.join(URL_SEP))
      }
      return Object.assign({}, state, {
        focus: action.to
      })
    }
  })[action.type] || (() => state))())
}

const store = createStore(appReducer)

/**************************************************************
 * Window Events
 **************************************************************/

window.addEventListener('popstate', () => {
  store.dispatch({ type: 'navigate', to: getItemsFromUrl(), history: false })
})

/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect(state => ({ focus: state.focus }))(({ focus, dispatch }) =>
  <div className='content'>
    <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}>🏠</a>
    <Context items={focus} />
  </div>
)

const Context = connect()(({ items, depth=0, label, dispatch }) => {

  // missing (e.g. due to rendering only a subset of items)
  // if (!(id in data)) {
  //   return <div className={'item missing container-depth' + depth}>{id}</div>
  // }

  // generate children from all items (not built for performance)
  const children = Object.keys(data).filter(key =>
    data[key].memberOf.some(memberSet => deepEqual(items, memberSet))
  )

  // only generate derived children at top level of view
  const derivedChildren = depth === 0 ? Object.keys(data).filter(key =>
    data[key].memberOf.some(memberSet =>
      superSet(memberSet, items) &&
      !deepEqual(memberSet, items)
    )
  ) : []

  // group derived items byDerived
  const groupedDerivedChildren = Object.values(derivedChildren.reduce((accum, key) => {
    return data[key].memberOf.reduce((accum, items) => {
      return Object.assign({}, accum, {
        [items.join(SEP)]: items
      })
    }, accum)
  }, {}))
    // XOR with children
    .filter(groupItems =>
      !children.some(childValue => deepEqual(groupItems, items.concat(childValue)))
    )

  // if (depth === 0) {
  //   console.Derivedh, items, groupedDerivedChildren)
  // }

  const root = items[0] === 'root'
  const isLeaf = children.length === 0 && derivedChildren.length === 0

  return <div className={'item-container container-depth' + depth + (isLeaf ? ' leaf' : '')}>

    { // item
    !root ? <div className={'item depth' + depth}>

      { // leaf
      isLeaf ? <span><span className='bullet'>•</span> {items[items.length - 1]}</span>
        // non-leaf
        : <div>
          { /* link to global context at top level */ }
          <Link items={depth === 0 ? [items[items.length - 1]] : items} label={label}/>
          { /* intersections */
          depth === 0 && items.length > 1 ? <span className='intersections'>
            {items.slice(0, items.length - 1).map((item, i) => <span key={i}>
              <span> + </span>
              <Link items={[item]}/>
            </span>)}
          </span> : null}
        </div>}
    </div> : null}

    { // direct children
    depth < maxDepth ? <div className='direct'>
      {children.map((childValue, i) => <Context key={i} items={(root ? [] : items).concat(childValue)} depth={depth + (root ? 0 : 1)}/>)}
    </div> : null}

    { // derived children
    depth < maxDepth ? <div className='derived'>
      {groupedDerivedChildren.map((items, i) => <Context key={i} items={items} label={items[items.length-2]} depth={depth + (root ? 0 : 1)}/>)}
    </div> : null}

  </div>
})

const Link = connect()(({ items, label, dispatch }) => <a onClick={e => {
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [items[items.length - 1]] : items })}
  }>
    <span>{label || items[items.length - 1]}</span>
  </a>
)

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
