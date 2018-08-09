/* eslint-disable jsx-a11y/accessible-emoji */
import './App.css'
import data from './data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

const SEP = '|SEPARATOR_TOKEN|'

/**************************************************************
 * Helpers
 **************************************************************/

// returns true if a is a strict super set of b
const superSet = (a, b) => b.length > 0 && b.every(itemB => a.includes(itemB))

// parses the items from the url
const getItemsFromUrl = () => {
  const urlComponents = window.location.pathname.slice(1)
  return urlComponents
    ? urlComponents.split('/').map(component => window.decodeURIComponent(component))
    : ['root']
}

const deepEqual = (a, b) =>
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB))

// gets the signifying label of the given context.
const signifier = items => items[items.length - 1]

// gets the intersections of the given context; i.e. the context without the signifier
const intersections = items => items.slice(0, items.length - 1)

const parents = (items, derived) => data[items[items.length - (derived ? 2 : 1)]].memberOf

const isRoot = items => items[0] === 'root'

// generates children of items
// TODO: cache for performance, especially of the app stays read-only
const getChildren = items => Object.keys(data).filter(key =>
  data[key].memberOf.some(parent => deepEqual(items, parent))
)

// derived children are items that the current context (items) is a non-leaf memberOf
const getDerivedChildren = items => uniqueSet(Array.prototype.concat.apply([], Object.keys(data).map(key =>
  data[key].memberOf.filter(parent =>
    superSet(parent, items) &&
    !deepEqual(parent, items) &&
    signifier(parent) === signifier(items)
  )
)))

// remove duplicate lists within a list
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
        window.history.pushState(state.focus, '', '/' + (deepEqual(action.to, ['root']) ? '' : action.to.map(item => window.encodeURIComponent(item)).join('/')))
      }
      return {
        focus: action.to
      }
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

const AppComponent = connect(({ focus }) => ({ focus }))(({ focus, dispatch }) =>
  <div className='content'>
    <HomeLink />
    <Context items={focus} />
  </div>
)

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'>🏠</span></a>
)

const Context = ({ items, level=0, label, derived }) => {

  // only generate derived children at top level of view
  const children = getChildren(items)
  const derivedChildren = level === 0 ? getDerivedChildren(items) : []
  const isLeaf = children.length === 0 && derivedChildren.length === 0

  return <div className={'item-container container-level' + level + (isLeaf ? ' leaf' : '')}>

    { // signifier
    !isRoot(items) ? <div className={'item level' + level}>

      <div>

        {level === 0 && items.length > 1
          ? <Intersections items={items}/>
          : null
        }

        { /* link to context or global context at top level */ }
        <Link items={level === 0 ? [signifier(items)] : items} label={label} isLeaf={isLeaf} />

        <Superscript items={items} level={level} derived={derived} />

      </div>
    </div> : null}

    { // children
    level < (derived ? 2 : 1)
      ? <Children items={items} children={children} level={level} />
      : null
    }

    { // derived children
    level < 1 && children.length === 0
      ? <DerivedChildren items={items} children={derivedChildren} level={level} />
      : null
    }

  </div>
}

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, isLeaf, dispatch }) => <a onClick={e => {
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items })}
  }>
    <span>
      {isLeaf ? <span className='bullet'>• </span> : ''}
      {label || signifier(items)}
    </span>
  </a>
)

// renders intersections (i.e. components other than the signifier)
const Intersections = ({ items }) => <span className='intersections'>
  {intersections(items).map((item, i) => <span key={i}>
    {i > 0 ? <span> + </span> : null}
    <Link items={[item]}/>
  </span>)}
</span>

const Children = ({ items, children, level }) => <div className='direct'>
  {children.map((childValue, i) => <Context
    key={i}
    items={(isRoot(items) ? [] : items).concat(childValue)}
    level={level + (isRoot(items) ? 0 : 1)}
  />)}
</div>

// derived children are rendered differently as they have an intermediate category that needs to be suppressed
const DerivedChildren = ({ items, children, level }) => <div className='derived'>
  {children.map((items, i) => <Context
    key={i}
    items={items}
    label={items.filter(item => item !== signifier(items)).join(' + ')}
    level={level + (isRoot(items) ? 0 : 1)}
    derived={true}
  />)}
</div>

// conditionally renders superscript depending on the level and if derived
const Superscript = ({ items, level, derived }) => {
  const otherContexts = parents(items, derived)
  return otherContexts.length > 1 && ((level === 0 && items.length > 1) || level > 0)
    ? <sup className='num-contexts'>{otherContexts.length}</sup>
    : null
}

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
