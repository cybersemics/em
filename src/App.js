/* eslint-disable jsx-a11y/accessible-emoji */
import './App.css'
import data from './data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

const SEP = '|SEPARATOR_TOKEN|'
const URL_SEP = '_→_'

/**************************************************************
 * Helpers
 **************************************************************/

// returns true if a is a strict super set of b
const superSet = (a, b) => b.length > 0 && b.every(itemB => a.includes(itemB))

const getItemsFromUrl = () => {
  const urlComponent = window.location.pathname.slice(1)
  return urlComponent ? window.decodeURI(urlComponent).split(URL_SEP) : ['root']
}

// TODO: figure out superset so that e.g. a context of "Maiden + Todo" shows "Maiden + Todo + Raine"
const deepEqual = (a, b) =>
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB))

// generate children from all items (not built for performance)
const getChildren = items => Object.keys(data).filter(key =>
  data[key].memberOf.some(parent => deepEqual(items, parent))
)

// unique set of lists
const uniqueSet = set => {
  const o = {}
  set.forEach(list => o[list.join(SEP)] = list)
  return Object.values(o)
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
        window.history.pushState(state.focus, '', '/' + (deepEqual(action.to, ['root']) ? '' : action.to.join(URL_SEP)))
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
    <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'>🏠</span></a>
    <Context items={focus} />
  </div>
)

const Context = connect()(({ items, depth=0, label, derived, dispatch }) => {

  const children = getChildren(items)

  // derived children are items that the current context (items) is a non-leaf memberOf
  // only generate derived children at top level of view
  const derivedChildren = depth === 0 ? uniqueSet(Array.prototype.concat.apply([], Object.keys(data).map(key =>
    data[key].memberOf.filter(parent =>
      superSet(parent, items) &&
      !deepEqual(parent, items) &&
      parent[parent.length - 1] === items[items.length - 1]
    )
  ))) : []

  const otherContexts = data[items[items.length - (derived ? 2 : 1)]].memberOf
  const isRoot = items[0] === 'root'
  const isLeaf = children.length === 0 && derivedChildren.length === 0

  return <div className={'item-container container-depth' + depth + (isLeaf ? ' leaf' : '')}>

    { // item
    !isRoot ? <div className={'item depth' + depth}>

      <div>

        { /* intersections */
        depth === 0 && items.length > 1 ? <span className='intersections'>
          {items.slice(0, items.length - 1).map((item, i) => <span key={i}>
            {i > 0 ? <span> + </span> : null}
            <Link items={[item]}/>
          </span>)}
        </span> : null}

        { /* link to global context at top level */ }
        <Link items={depth === 0 ? [items[items.length - 1]] : items} label={label} isLeaf={isLeaf} />

        { /* superscript */ }
        {otherContexts.length > 1 && ((depth === 0 && items.length > 1) || depth > 0) ? <sup className='num-contexts'>{otherContexts.length}</sup> : null}

      </div>
    </div> : null}

    { // direct children
    depth < (derived ? 2 : 1) ? <div className='direct'>
      {children.map((childValue, i) => <Context key={i} items={(isRoot ? [] : items).concat(childValue)} depth={depth + (isRoot ? 0 : 1)}/>)}
    </div> : null}

    { // derived children
    depth < 1 && children.length === 0 ? <div className='derived'>
      {derivedChildren.map((items, i) => <Context key={i} items={items} label={items.filter(item => item !== items[items.length - 1]).join(' + ')} depth={depth + (isRoot ? 0 : 1)} derived={true} />)}
    </div> : null
    }

  </div>
})

const Link = connect()(({ items, label, isLeaf, dispatch }) => <a onClick={e => {
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [items[items.length - 1]] : items })}
  }>
    <span>{isLeaf ? '• ' : ''}{label || items[items.length - 1]}</span>
  </a>
)

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
