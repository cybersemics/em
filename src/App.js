/* eslint-disable jsx-a11y/accessible-emoji */
import './App.css'
import data from './data.js'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'
import * as emojiStrip from 'emoji-strip'

/**************************************************************
 * Constants
 **************************************************************/

const KEY_ENTER = 13
const KEY_ESCAPE = 27

// maximum number of grandchildren that are allowed to expand
const EXPAND_MAX = 20

// number of characters at which an item is indented as prose
const INDENT_MIN = 64

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

const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))

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

// sorts items emoji and whitespace insensitive
const sorter = (a, b) =>
  emojiStrip(a).trim().toLowerCase() >
  emojiStrip(b).trim().toLowerCase() ? 1 : -1

// gets the signifying label of the given context.
const signifier = items => items[items.length - 1]

// returns true if the signifier of the given context exists in the data
const exists = items => !!data[signifier(items)]

// gets the intersections of the given context; i.e. the context without the signifier
const intersections = items => items.slice(0, items.length - 1)

const hasIntersections = items => items.length > 1

const getParents = (items) => {
  const key = signifier(items)
  if (!exists(items)) {
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

const hasDerivedChildren = items => getParents(items).length > 1

const emptySubheadings = (focus, subheadings) =>
  hasIntersections(focus) &&
  subheadings.length === 1 &&
  !hasChildren(subheadings[0])

const isLeaf = items =>
  !hasChildren(items) &&
  !hasDerivedChildren(items) &&
  !hasChildren([signifier(items)]) // empty subheadings redirect

// gets the number of lines of text in the given element
const lines = el => Math.round(el.offsetHeight / parseInt(window.getComputedStyle(el).lineHeight), 10)

// marks all child lists as multiline if they have a child with more than one line of text
const markChildListsMultiline = () => {
  const childLists = document.getElementsByClassName('children')
  for(let i=0; i<childLists.length; i++) {
    if(childLists[i].firstChild) {
      markMultiline(childLists[i])
    }
  }
}

// marks an elements as multiline when at least one child has more than one line of text
const markMultiline = el => {
  el.classList.remove('multiline')

  if (el.children.length === 1) return

  for (let j=0; j<el.children.length; j++) {
    const child = el.children[j]
    // div > li > h3
    if(lines(child.firstChild.firstChild) > 1) {
      el.classList.add('multiline')
      return
    }
  }
}

/**************************************************************
 * Store & Reducer
 **************************************************************/

const initialState = {
  focus: getItemsFromUrl(),
  from: getFromFromUrl(),
  editingNewItem: false,
  editingContent: '',

  // cheap trick to re-render when data has been updated
  dataNonce: 0
}

const appReducer = (state = initialState, action) => {
  return Object.assign({}, state, (({
    navigate: () => {
      if (deepEqual(state.focus, action.to)) return state
      if (action.history !== false) {
        window.history[action.replace ? 'replaceState' : 'pushState'](
          state.focus,
          '',
          '/' + (deepEqual(action.to, ['root']) ? '' : action.to.map(item => window.encodeURIComponent(item)).join('/')) + (action.from && action.from.length > 0 ? '?from=' + encodeURIComponent(action.from.join('/')) : '')
        )
      }
      return {
        focus: action.to,
        from: action.from,
        editingNewItem: false,
        editingContent: ''
      }
    },
    newItemSubmit: () => {

      // create item if non-existent
      if (!exists([action.value])) {
        data[action.value] = {
          id: action.value,
          value: action.value,
          memberOf: []
        }
      }

      // add to context
      data[action.value].memberOf.push(action.context)

      setTimeout(() => {
        window.document.getElementsByClassName('add-new-item')[0].textContent = ''

        // TODO
        store.dispatch({ type: 'newItemInput', value: '' })
      })

      return {
        editingContent: '',
        dataNonce: state.dataNonce + 1
      }
    },
    newItemEdit: () => {
      // wait for re-render
      setTimeout(() => {
        window.document.getElementsByClassName('add-new-item')[0].focus()
      })
      return {
        editingNewItem: true
      }
    },
    newItemCancel: () => ({
      editingNewItem: false,
      editingContent: ''
    }),
    newItemInput: () => ({
      editingContent: action.value
    })
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

const AppComponent = connect(({ dataNonce, focus, from, editingNewItem, editingContent }) => ({ dataNonce, focus, from, editingNewItem, editingContent }))(({ dataNonce, focus, from, editingNewItem, editingContent, dispatch }) => {

  const directChildren = getChildren(focus)
  const hasDirectChildren = directChildren.length > 0

  const subheadings = hasDirectChildren ? [focus]
    : from ? sortToFront(from.concat(focus), getDerivedChildren(focus))
    : getDerivedChildren(focus)

  // if there are derived children but they are all empty, then bail and redirect to the global context
  if (emptySubheadings(focus, subheadings)) {
    setTimeout(() => {
      dispatch({ type: 'navigate', to: [signifier(focus)], replace: true })
    }, 0)
    return null
  }

  return <div className='content'>
    <HomeLink />

    { /* Heading */ }
    {/*!isRoot(focus) ? <Heading items={hasDirectChildren ? [signifier(focus)] : focus} from={hasDirectChildren ? intersections(focus) : null} /> : null*/}

    { /* Subheadings */ }
    <Subheadings subheadings={subheadings} directChildren={directChildren} focus={focus} from={from} editingNewItem={editingNewItem} editingContent={editingContent} expandable />
  </div>
})

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'>🏠</span></a>
)

const Heading = ({ items, from }) => <h1>
  <Link items={items} from={from} />
  <Superscript items={items} />
</h1>

const Subheadings = ({ subheadings, directChildren, focus, expandable, from, editingNewItem, editingContent }) => {

  setTimeout(markChildListsMultiline)

  const hasDirectChildren = directChildren.length > 0
  return <div>
    {subheadings.map((items, i) => {
      const children = (hasDirectChildren
        ? directChildren
        : getChildren(items)
      ).sort(sorter)

      const prose = hasDirectChildren &&
        children.filter(child => signifier(items.concat(child)).length > INDENT_MIN).length > children.length / 2

      // get a flat list of all grandchildren to determine if there is enough space to expand
      const grandchildren = flatMap(children, child => getChildren(items.concat(child)))
      const otherContexts = getParents(focus)

      return i === 0 || (hasDirectChildren || from) ? <div key={i}>
        { /* Subheading */ }
        {!isRoot(focus) ? <Subheading items={items} /> : null}

        { /* Subheading Children */ }
        <ul className='children'>
          {children.map((child, i) => {
            const childItems = (isRoot(focus) ? [] : items).concat(child)
            return <Child key={i} items={childItems} prose={prose} expanded={i === 0 && expandable && grandchildren.length > 0 && grandchildren.length < EXPAND_MAX} />
          })}
        </ul>

        { /* New Item */ }
        <NewItem context={focus} editing={editingNewItem} editingContent={editingContent} />

        { /* Other Contexts */ }
        {i === 0 && otherContexts.length > 1 && (hasDirectChildren || from) ? <div className='other-contexts'>
            <Link items={hasDirectChildren || !from /* TODO: Is this right? */? [signifier(focus)] : from.concat(focus)}
              label={<span>{otherContexts.length - 1} other context{otherContexts.length > 2 ? 's' : ''} <span className={hasDirectChildren ? 'down-chevron' : 'up-chevron'}>{hasDirectChildren ? '⌄' : '⌃'}</span></span>}
              from={focus.length > 0 ? intersections(focus) : null}
          />
          </div> : null}
      </div> : null
    })}
  </div>
}

const Subheading = ({ items }) => <h2>
  {items.map((item, i) => {
    const subitems = subset(items, item)
    return <span key={i} className={item === signifier(items) ? 'subheading-focus' : null}>
      {i > 0 ? <span> + </span> : null}
      <Link items={subitems} disabled={item === signifier(items)} />
      <Superscript items={subitems} />
    </span>
  })}
</h2>

const Child = ({ items, prose, expanded }) => {
  return <div className={'child' + (expanded ? ' expanded ' : '') + (isLeaf(items) ? ' leaf' : '')}>
    <li>
      <h3 className={prose ? 'prose' : null}>
        <Link items={items} />
        <Superscript items={items} />
      </h3>

      { /* Subheading Grandchildren */ }
      {expanded ? getChildren(items).map((child, i) => {
        const childItems = (isRoot(items) ? [] : items).concat(child)
        return <Grandchild key={i} items={childItems} />
      }) : null}
    </li>
  </div>
}

const Grandchild = ({ items, leaf }) => <h4 className={isLeaf(items) ? 'leaf' : null}>
  <span className='bullet'>•&nbsp;</span>
  <Link items={items} />
  <Superscript items={items} />
</h4>


// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, from, disabled, dispatch }) => {
  const value = label || signifier(items)
  return disabled ?
    <span>{value}</span> :
    <a className='link' onClick={e => {
      document.getSelection().removeAllRanges()
      dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from })}
    }>{value}</a>
})

// renders superscript if there are other contexts
const Superscript = ({ items, showSingle }) => {
  if (!items || items.length === 0 || !exists(items)) return null
  const otherContexts = getParents(items)
  return otherContexts.length > (showSingle ? 0 : 1)
    ? <sup className='num-contexts'>{otherContexts.length}</sup>
    : null
}

const NewItem = connect()(({ context, editing, editingContent, dispatch }) => {
  return <div>
    {editing ?
      <h3>
        <span contentEditable className='add-new-item' onInput={e => {
          dispatch({ type: 'newItemInput', value: e.target.textContent })
        }} onKeyDown={e => {
          if (e.keyCode === KEY_ENTER) {
            dispatch({ type: 'newItemSubmit', context, value: e.target.textContent })
          }
          else if (e.keyCode === KEY_ESCAPE) {
            dispatch({ type: 'newItemCancel' })
          }
        }}/>
        {<Superscript items={[editingContent]} showSingle={true} />}
      </h3> :
      <span className='add-icon' onClick={() => dispatch({ type: 'newItemEdit' })}>+</span>
    }
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
