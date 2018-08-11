/* eslint-disable jsx-a11y/accessible-emoji */
import './App.css'
import data from './data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

/**************************************************************
 * Helpers
 **************************************************************/

// parses the items from the url
const getItemsFromUrl = () => {
  const urlComponents = window.location.pathname.slice(1)
  return urlComponents
    ? urlComponents.split('/').map(component => window.decodeURIComponent(component))
    : ['root']
}

const getFromFromUrl = () => {
  return window.location.search
    ? window.decodeURIComponent(window.location.search.slice(1).split('=')[1]).split('/')
    : null
}

const deepEqual = (a, b) =>
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB))

const deepIndexOf = (item, list) => {
  for(let i=0; i<list.length; i++) {
    if (deepEqual(item, list[i])) return i
  }
  return -1
}

// sorts the given item to the front of the list
const sortToFront = (item, list) => {
  const i = deepIndexOf(item, list)
  if (i === -1) throw new Error(`${item} not found in ${list.join(', ')}`)
  return [].concat(
    [item],
    list.slice(0, i),
    list.slice(i + 1)
  )
}

// gets the signifying label of the given context.
const signifier = items => items[items.length - 1]

// gets the intersections of the given context; i.e. the context without the signifier
const intersections = items => items.slice(0, items.length - 1)

const hasIntersections = items => items.length > 1

const getParents = (items, derived) => {
  const key = items[items.length - (derived ? 2 : 1)]
  if (!data[key]) {
    throw new Error(`Unknown key: "${key}", from context: ${items.join(',')}`)
  }
  return data[key].memberOf
}

const subset = (items, item) => items.slice(0, items.indexOf(item) + 1)

const isRoot = items => items[0] === 'root'

// generates children of items
// TODO: cache for performance, especially of the app stays read-only
const getChildren = items => Object.keys(data).filter(key =>
  data[key].memberOf.some(parent => deepEqual(items, parent))
)

const hasChildren = items => Object.keys(data).some(key =>
  data[key].memberOf.some(parent => deepEqual(items, parent))
)

// derived children are all grandchildren of the parents of the given context
const getDerivedChildren = items =>
  getParents(items)
    .filter(parent => !isRoot(parent))
    .map(parent => parent.concat(signifier(items)))

const isLeaf = items => {
  const derivedChildren = getDerivedChildren(items)
  return !hasChildren(items) && derivedChildren.every(child => !hasChildren(child))
}


/**************************************************************
 * Store & Reducer
 **************************************************************/

const initialState = {
  focus: getItemsFromUrl(),
  from: getFromFromUrl()
}

const appReducer = (state = initialState, action) => {
  return Object.assign({}, state, (({
    'navigate': () => {
      if (deepEqual(state.focus, action.to)) return state
      if (action.history !== false) {
        window.history[action.replace ? 'replaceState' : 'pushState'](
          state.focus,
          '',
          '/' + (deepEqual(action.to, ['root']) ? '' : action.to.map(item => window.encodeURIComponent(item)).join('/')) + (action.from ? '?from=' + encodeURIComponent(action.from.join('/')) : '')
        )
      }
      return {
        focus: action.to,
        from: action.from
      }
    }
  })[action.type] || (() => state))())
}

const store = createStore(appReducer)

/**************************************************************
 * Window Events
 **************************************************************/

window.addEventListener('popstate', () => {
  store.dispatch({
    type: 'navigate',
    to: getItemsFromUrl(),
    from: getFromFromUrl(),
    history: false
  })
})

/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect(({ focus, from }) => ({ focus, from }))(({ focus, from, dispatch }) => {

  const directChildren = getChildren(focus)
  const hasDirectChildren = directChildren.length > 0

  const subheadings = hasDirectChildren ? [focus]
    : from ? sortToFront(from.concat(focus), getDerivedChildren(focus))
    : getDerivedChildren(focus)

  const otherContexts = getParents(focus)

  // if there are derived children but they are all empty, then bail and redirect to the global context
  const emptyDerived = subheadings.length === 1 && !subheadings.some(subheading => getChildren(subheading).length > 0)
  if (emptyDerived && hasIntersections(focus)) {
    setTimeout(() => {
      dispatch({ type: 'navigate', to: [signifier(focus)], replace: true })
    }, 0)
    return null
  }

  return <div className='content'>
    <HomeLink />

    { /* Heading */ }
    {!isRoot(focus) ? <Heading items={focus} /> : null}

    { /* Subheadings */ }
    {subheadings.map((items, i) => {
      const children = hasDirectChildren
        ? directChildren
        : getChildren(items) // TODO: keep going?

      return <div key={i}>
        { /* Subheading */ }
        {hasIntersections(items) ? <Subheading items={items} /> : null}

        { /* Subheading Children */ }
        {(children.length > 0
          ? children
          : children.slice(1)).map((child, i) =>
            <Item items={(
              !hasDirectChildren ? items.slice(1)
              : isRoot(focus) ? []
              : items
            ).concat(child)} key={i} />
        )}
      </div>
    })}

    { /* Other Contexts */ }
    {hasDirectChildren && otherContexts.length > 1 ? <div className='other-contexts'>
        <Link items={[signifier(focus)]}
          label={<span>+ {otherContexts.length - 1} other context{otherContexts.length > 2 ? 's' : ''} <span className='down-chevron'>⌄</span></span>}
          from={intersections(focus)}
      />
      </div> : null}
  </div>
})

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'>🏠</span></a>
)

const Heading = ({ items }) => <h1>
  <Link items={items} />
  <Superscript items={items} />
</h1>

const Subheading = ({ items }) => {
  return <h2>
    {intersections(items).map((item, i) => {
      const subitems = subset(items, item)
      return <span key={i}>
        {i > 0 ? <span> + </span> : null}
        <Link items={subitems}/>
        <Superscript items={subitems} />
      </span>
    })}
  </h2>
}

const Item = ({ items }) => <h3>
  {isLeaf(items) ? <span className='bullet'>•&nbsp;</span> : null}
  <Link items={items} />
  <Superscript items={items} />
</h3>

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, from, dispatch }) => <a onClick={e => {
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from })}
  }>
    <span>{label || signifier(items)}</span>
  </a>
)

// renders superscript if there are other contexts
const Superscript = ({ items }) => {
  const otherContexts = getParents(items)
  return otherContexts.length > 1
    ? <sup className='num-contexts'>{otherContexts.length}</sup>
    : null
}

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
