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

const parents = (items, derived) => {
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

// derived children are all grandchildren of the parents of the given context
const getDerivedChildren = items =>
  parents(items)
    .filter(parent => !isRoot(parent))
    .map(parent => parent.concat(signifier(items)))

const hasDirectChildren = items => Object.keys(data).some(key => {
  return data[key].memberOf.some(parent => deepEqual(items, parent))
})

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

const AppComponent = connect(({ focus, from }) => ({ focus, from }))(({ focus, from, dispatch }) =>
  <div className='content'>
    <HomeLink />
    <Context items={focus} from={from} />
  </div>
)

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'>🏠</span></a>
)

const Context = connect()(({ items, level=0, label, derived, from, dispatch }) => {

  const children = getChildren(items)
  // TODO
  const derivedChildren = !isRoot(items) && children.length === 0 && level === 0
    ? (from ? sortToFront(from, getDerivedChildren(items)) : getDerivedChildren(items))
    : []
  const isLeaf = children.length === 0 && derivedChildren.length === 0
  const otherContexts = level === 0 && derivedChildren.length === 0 ? parents(items, derived) : []

  // if there are derived children but they are all empty, then bail and redirect to the global context
  const emptyDerived = derivedChildren.length && !derivedChildren.some(hasDirectChildren)
  if (emptyDerived && !deepEqual(items, [signifier(items)])) {
    setTimeout(() => {
      dispatch({ type: 'navigate', to: [signifier(items)], replace: true })
    }, 0)
    return null
  }

  return <div className={'item-container container-level' + level + (isLeaf ? ' leaf' : '')}>

    { // signifier
    !isRoot(items) ? <div className={'item level' + level}>

      <div>

        { /* link to context or global context at top level */ }
        <Link items={level === 0
          ? [signifier(items)]
          : isLeaf && derived
            ? intersections(items)
            : items
        } label={label} isLeaf={isLeaf && !derived} />

        <Superscript items={items} level={level} derived={derived} />

        {level === 0 && items.length > 1 && children.length > 0 //&& hasDerivedGrandchildren
          ? <Intersections items={items}/>
          : null
        }

      </div>
    </div> : null}

    { // children
    level < (derived ? 2 : 1)
      ? <Children items={items} children={/*derivedChildren.length > 0 && !hasDerivedGrandchildren ? getChildren([signifier(items)]) :*/ children} level={level} />
      : null
    }

    { // link to global context i.e. show other contexts
      otherContexts.length > 1 && level === 0 ? <div className='other-contexts'>
        <Link items={level === 0
          ? [signifier(items)]
          : isLeaf && derived
            ? intersections(items)
            : items}
          label={<span>+ {otherContexts.length - 1} other context{otherContexts.length > 2 ? 's' : ''} <span className='down-chevron'>⌄</span></span>}
          from={items}
      />
      </div> : null
    }


    { // derived children
    level < 1
      ? <DerivedChildren items={items} children={derivedChildren} level={level} from={from} />
      : null
    }

  </div>
})

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, isLeaf, from, dispatch }) => <a onClick={e => {
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from })}
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
    <span className='intersection-component'><Link items={subset(items, item)}/></span>
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
const DerivedChildren = ({ items, children, level, from }) => <div className={'derived' + (from ? ' from' : '')}>
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
  return otherContexts.length > 1
    ? <sup className='num-contexts'>{otherContexts.length}</sup>
    : null
}

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
