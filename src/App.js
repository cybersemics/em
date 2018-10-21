/* eslint-disable jsx-a11y/accessible-emoji */
import './App.css'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'
// import * as emojiStrip from 'emoji-strip'
import logo from './logo-180x180.png'
import ContentEditable from 'react-contenteditable'

/**************************************************************
 * Constants
 **************************************************************/

// maximum number of grandchildren that are allowed to expand
// const EXPAND_MAX = 12

// maximum number of characters of children to allow expansion
const NESTING_CHAR_MAX = 250

// ms on startup before offline mode is enabled
const OFFLINE_TIMEOUT = 3000

const RENDER_DELAY = 50

const firebaseConfig = {
  apiKey: "AIzaSyB7sj38woH-oJ7hcSwpq0lB7hUteyZMxNo",
  authDomain: "em-proto.firebaseapp.com",
  databaseURL: "https://em-proto.firebaseio.com",
  projectId: "em-proto",
  storageBucket: "em-proto.appspot.com",
  messagingSenderId: "91947960488"
}

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
const sumLength = list => list.reduce((accum, current) => accum + current.length, 0)

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

const compareByRank = (a, b) =>
  a.rank > b.rank ? 1 :
  a.rank < b.rank ? -1 :
  0

// sorts items emoji and whitespace insensitive
// const sorter = (a, b) =>
//   emojiStrip(a.toString()).trim().toLowerCase() >
//   emojiStrip(b.toString()).trim().toLowerCase() ? 1 : -1

// gets the signifying label of the given context.
const signifier = items => items[items.length - 1]

// returns true if the signifier of the given context exists in the data
const exists = items => !!store.getState().data[signifier(items)]

// gets the intersections of the given context; i.e. the context without the signifier
const intersections = items => items.slice(0, items.length - 1)

const hasIntersections = items => items.length > 1

const getParents = (items) => {
  const key = signifier(items)
  if (!exists(items)) {
    throw new Error(`Unknown key: "${key}", from context: ${items.join(',')}`)
  }
  return (store.getState().data[key].memberOf || [])
    .map(member => member.context || member) // TEMP: || member for backwards compatibility
}

const subset = (items, item) => items.slice(0, items.indexOf(item) + 1)

const isRoot = items => items[0] === 'root'

// generates children with their ranking
// TODO: cache for performance, especially of the app stays read-only
const getChildrenWithRank = items => {
  const data = store.getState().data
  return flatMap(Object.keys(data), key =>
    ((data[key] || []).memberOf || [])
      // .sort(compareByRank)
      // .map(member => { /*console.log(member); */return member.context || member }) // TEMP: || member for backwards compatibility
      .map(member => {
        if (!member) {
          throw new Error(`Key "${key}" has  null parent`)
        }
        // if (deepEqual(items, member.context || member)) {
        //   console.log('member', key, member.rank)
        // }
        return {
          key,
          rank: member.rank || 0,
          isMatch: deepEqual(items, member.context || member)
        }
      })
    )
    // filter out non-matches
    .filter(match => match.isMatch)
    // sort by rank
    .sort(compareByRank)
}

// generates children values only
// TODO: cache for performance, especially of the app stays read-only
const getChildren = items => {
  return getChildrenWithRank(items)
    .map(child => child.key)
}

// gets a new rank after the given item in a list but before the following item
const getRankAfter = (value, context) => {
  const children = getChildrenWithRank(context)
  const i = children.findIndex(child => child.key === value)
  const prevChild = children[i]
  const nextChild = children[i + 1]

  const rank = nextChild
    ? (prevChild.rank + nextChild.rank) / 2
    : prevChild.rank + 1

  return rank
}

// gets the next rank at the end of a list
const getNextRank = items => {
  const children = getChildrenWithRank(items)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}

const hasChildren = items => {
  const data = store.getState().data
  return Object.keys(data).some(key =>
    ((data[key] || []).memberOf || [])
      .map(member => member.context || member) // TEMP: || member for backwards compatibility
      .some(parent => deepEqual(items, parent))
  )
}

// derived children are all grandchildren of the parents of the given context
const getDerivedChildren = items =>
  getParents(items)
    .filter(parent => !isRoot(parent))
    .map(parent => parent.concat(signifier(items)))

const emptySubheadings = (focus, subheadings) =>
  hasIntersections(focus) &&
  subheadings.length === 1 &&
  !hasChildren(subheadings[0])

const isLeaf = items =>
  !hasChildren(items) &&
  !hasChildren([signifier(items)]) // empty subheadings redirect

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false

// restores the selection to a given editable item
// and then dispatches existingItemFocus
const restoreSelection = (items, dispatch) => {
  // only re-apply the selection the first time
  if (!disableOnFocus) {

    disableOnFocus = true
    let focusOffset = 0

    setTimeout(() => {
      focusOffset = window.getSelection().focusOffset
    }, 0)

    // 2. dispatch the event to expand/contract nodes
    setTimeout(() => {
      dispatch({ type: 'existingItemFocus', items })
    }, 0)

    // 3. re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        disableOnFocus = false
      }, 0)

      // re-apply the selection
      const el = document.getElementsByClassName('editable-' + items.join('-'))[0]
      if (!el) {
        throw new Error(`Could not find element: "editable-${items.join('-')}"`)
      }
      if (el.childNodes.length === 0) {
        el.appendChild(document.createTextNode(''))
      }
      const textNode = el.childNodes[0]
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(textNode, Math.min(focusOffset, textNode.textContent.length))
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }, 0)
  }
}

/**************************************************************
 * Store & Reducer
 **************************************************************/

const initialState = {
  status: 'connecting',
  focus: getItemsFromUrl(),
  from: getFromFromUrl(),
  editingNewItem: null,
  editingContent: '',
  data: {
    root: {}
  },

  // cheap trick to re-render when data has been updated
  dataNonce: 0
}

// load data from localStorage
for(let key in localStorage) {
  if (key.startsWith('data-')) {
    const value = key.substring(5)
    initialState.data[value] = JSON.parse(localStorage[key])
  }
}

const appReducer = (state = initialState, action) => {
  return Object.assign({}, state, (({

    status: () => ({
      status: action.value
    }),

    authenticated: () => ({
      status: 'authenticated',
      user: action.user,
      userRef: action.userRef
    }),

    data: () => ({
      data: Object.assign({}, state.data, {
        [action.item.value]: action.item,
      }),
      lastUpdated: (new Date()).toISOString(),
      dataNonce: state.dataNonce + (action.bumpNonce ? 1 : 0)
    }),

    delete: () => {
      delete state.data[action.value]
      return {
        data: Object.assign({}, state.data),
        lastUpdated: (new Date()).toISOString(),
        dataNonce: state.dataNonce + (action.bumpNonce ? 1 : 0)
      }
    },

    navigate: () => {
      if (deepEqual(state.focus, action.to) && deepEqual([].concat(getFromFromUrl()), [].concat(action.from))) return state
      if (action.history !== false) {
        window.history[action.replace ? 'replaceState' : 'pushState'](
          state.focus,
          '',
          '/' + (deepEqual(action.to, ['root']) ? '' : action.to.map(item => window.encodeURIComponent(item)).join('/')) + (action.from && action.from.length > 0 ? '?from=' + window.encodeURIComponent(action.from.join('/')) : '')
        )
      }
      return {
        cursor: [],
        focus: action.to,
        from: action.from,
        editingNewItem: null,
        editingContent: ''
      }
    },

    newItemSubmit: () => {

      // create item if non-existent
      const item = action.value in state.data
        ? state.data[action.value]
        : {
          id: action.value,
          value: action.value,
          memberOf: []
        }

      // add to context
      item.memberOf.push({
        context: action.context,
        rank: action.rank
      })

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {
        sync(action.value, {
          value: item.value,
          memberOf: item.memberOf
        }, null, true)

        if (action.ref) {
          action.ref.textContent = ''
        }

        store.dispatch({ type: 'newItemInput', value: '' })
      }, RENDER_DELAY)

      return {
        editingContent: '',
        dataNonce: state.dataNonce + 1
      }
    },

    newItemEdit: () => {

      // wait for re-render
      setTimeout(() => {
        action.ref.focus()
      }, RENDER_DELAY)

      return {
        editingNewItem: action.context
      }
    },

    newItemCancel: () => {

      action.ref.textContent = ''

      return {
        editingNewItem: null,
        editingContent: ''
      }
    },

    newItemInput: () => ({
      editingContent: action.value
    }),

    existingItemFocus: () => {
      return {
        cursor: action.items
      }
    },

    existingItemInput: () => {

      const item = state.data[action.oldValue]

      if(!item) {
        throw new Error('Typing speed exceeded sync rate (known issue).')
      }

      const newData = {
        value: action.newValue,
        memberOf: item.memberOf
      }

      // const item = action.oldValue in state.data
      //   ? state.data[action.oldValue]
      //   : {
      //     id: action.oldValue,
      //     value: action.value,
      //     memberOf: []
      //   }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {

        del(action.oldValue)

        sync(action.newValue, newData)

      }, RENDER_DELAY)

      return {}
    },

    existingItemDelete: () => {

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {
        del(action.value, null, true)
      })

      return {
        dataNonce: state.dataNonce + 1
      }
    }

  })[action.type] || (() => state))())
}

const store = createStore(appReducer)

/**************************************************************
 * LocalStorage && Firebase Setup
 **************************************************************/

// firebase init
const firebase = window.firebase
firebase.initializeApp(firebaseConfig)

// Set to offline mode in 5 seconds. Cancelled with successful login.
const offlineTimer = window.setTimeout(() => {
  store.dispatch({ type: 'status', value: 'offline' })
}, OFFLINE_TIMEOUT)

// delay presence detection to avoid initial disconnected state
// setTimeout(() => {
// }, 1000)
const connectedRef = firebase.database().ref(".info/connected")
connectedRef.on('value', snap => {
  const connected = snap.val()

  // update offline state
  // do not set to offline if in initial connecting state; wait for timeout
  if (connected || store.getState().status !== 'connecting') {
    store.dispatch({ type: 'status', value: connected ? 'connected' : 'offline' })
  }
})

// check if user is logged in
firebase.auth().onAuthStateChanged(user => {

  // if not logged in, redirect to OAuth login
  if (!user) {
    store.dispatch({ type: 'offline', value: true })
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider)
    return
  }

  // disable offline mode
  window.clearTimeout(offlineTimer)

  // if logged in, save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  store.dispatch({
    type: 'authenticated',
    userRef,
    user
  })

  // update user information
  userRef.update({
    name: user.displayName,
    email: user.email
  })

  // load Firebase data
  userRef.on('value', snapshot => {
    const value = snapshot.val()

    // init root if it does not exist
    if (!value.data || !value.data.root) {
      sync('root')
    }
    // otherwise sync all data
    // TODO: Optimize; Sync is called for every item
    else {
      // TODO: check each timestamp
      // for (let key in value.data) {
      //   sync(key, value.data[key], true)
      // }
    }
  })

})

// delete from state, localStorage, and Firebase
const del = (key, localOnly, bumpNonce) => {

  const lastUpdated = (new Date()).toISOString()

  // state
  store.dispatch({ type: 'delete', value: key, bumpNonce })

  // localStorage
  localStorage.removeItem('data-' + key)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly) {
    store.getState().userRef.child('data/' + key).remove()
  }

}

// save to state, localStorage, and Firebase
const sync = (key, item={}, localOnly, bumpNonce) => {

  const lastUpdated = (new Date()).toISOString()
  const timestampedItem = Object.assign({}, item, { lastUpdated })

  // state
  store.dispatch({ type: 'data', item: timestampedItem, bumpNonce })

  // localStorage
  localStorage['data-' + key] = JSON.stringify(timestampedItem)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly) {
    store.getState().userRef.update({
      ['data/' + key]: timestampedItem,
      lastUpdated
    })
  }

}

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

const AppComponent = connect((
    { cursor=[], dataNonce, focus, from, editingNewItem, editingContent, status }) => (
    { cursor, dataNonce, focus, from, editingNewItem, editingContent, status }))((
    { cursor=[], dataNonce, focus, from, editingNewItem, editingContent, status, dispatch }) => {

  const directChildren = getChildren(focus)
  const hasDirectChildren = directChildren.length > 0

  const subheadings = hasDirectChildren ? [focus]
    : from ? sortToFront(from.concat(focus), getDerivedChildren(focus))//.sort(sorter))
    : getDerivedChildren(focus)//.sort(sorter)

  // if there are derived children but they are all empty, then bail and redirect to the global context
  if (emptySubheadings(focus, subheadings)) {
    setTimeout(() => {
      dispatch({ type: 'navigate', to: [signifier(focus)], replace: true })
    }, 0)
    return null
  }

  const otherContexts = getParents(focus)

  return <div className={'content' + (from ? ' from' : '')}>
    <HomeLink />
    <Status status={status} />

    { /* Subheadings */ }
    <div>
      { /* TODO: Why is this separate? */ }
      {!isRoot(focus) && subheadings.length === 0 ? <div>
          { /* Subheading */ }
        <Subheading items={focus} />

        { /* New Item */ }
        <NewItem context={focus} editing={editingNewItem && deepEqual(editingNewItem, focus)} editingContent={editingContent} />
      </div> : null}

      {subheadings.map((items, i) => {
        const children = (hasDirectChildren
          ? directChildren
          : getChildren(items)
        )//.sort(sorter)

        // get a flat list of all grandchildren to determine if there is enough space to expand
        // const grandchildren = flatMap(children, child => getChildren(items.concat(child)))

        return i === 0 || otherContexts.length > 0 || hasDirectChildren || from ? <div key={i}>
          { /* Subheading */ }
          {!isRoot(focus) ? <Subheading items={items} /> : null}

          { /* Subheading Children */ }
          {children.length > 0 ? <ul className={'children distance-from-cursor-' + Math.min(3, cursor.length - items.length + 1)}>
            {children.map((child, j) => {
              const childItems = (isRoot(focus) ? [] : items).concat(child)
              // expand the child (i.e. render grandchildren) either when looking at a specific context or the first subheading of a global context with 'from'
              return <Child key={j} cursor={cursor} items={childItems} expandable={((from && i === 0) || hasDirectChildren) && cursor.includes(child)} />
              // return <Child key={j} items={childItems} expandable={((from && i === 0) || hasDirectChildren) && grandchildren.length > 0 && grandchildren.length < EXPAND_MAX} />
            })}
          </ul> : null}

          { /* New Item */ }
          <ul style={{ marginTop: 0 }} className={!editingNewItem ? 'list-none' : null}>
            <li className='leaf'><NewItem context={items} editing={editingNewItem && deepEqual(editingNewItem, items)} editingContent={editingContent} /></li>
          </ul>

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
  </div>
})

const Status = ({ status }) => <div className='status'>
  {status === 'connecting' ? <span>Connecting...</span> : null}
  {status === 'offline' ? <span className='error'>Offline</span> : null}
</div>

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'><img src={logo} alt='em' width='24' /></span></a>
)

const Subheading = ({ items }) => <h2>
  {items.map((item, i) => {
    const subitems = subset(items, item)
    return <span key={i} className={item === signifier(items) ? 'subheading-focus' : null}>
      {i > 0 ? <span> + </span> : null}
      <Link items={subitems} />
      <Superscript items={subitems} />
    </span>
  })}
</h2>

/** A recursive child element that consists of a <li> containing an <h3> and <ul> */
const Child = connect()(({ items, cursor=[], expandable=true, depth=0, count=0 }) => {

  const children = getChildren(items)
  const expanded = expandable &&
    children.length > 0 &&
    count + sumLength(children) <= NESTING_CHAR_MAX

  return <li className={
    'child' +
    (expanded ? ' expanded ' : '') +
    (isLeaf(items) ? ' leaf' : '')
  }>
    <h3 className={depth === 0 ? 'child-heading' : 'grandchild-heading'}>
      <Editable items={items} />
      <Superscript items={items} />
      <span className='depth-bar' style={{ width: children.length * 2 }} />
    </h3>

    { /* Recursive Children */ }
    {expanded ? <ul className={'children distance-from-cursor-' + Math.min(3, cursor.length - items.length)}>
      {children.map((child, i) => {
        const childItems = (isRoot(items) ? [] : items).concat(child)
        return <Child key={i} cursor={cursor} items={childItems} count={count + sumLength(children)} depth={depth + 1} expandable={cursor.includes(child)} />
      })}
    </ul> : null}
  </li>
})

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, from, dispatch }) => {
  const value = label || signifier(items)
  return <span className='link' onClick={e => {
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from: e.shiftKey ? getItemsFromUrl() : from })
  }}>{value}</span>
})

// renders a link with the appropriate label to the given context
const Editable = connect()(({ items, label, from, cursor, dispatch }) => {
  const value = label || signifier(items)
  const ref = React.createRef()
  const context = items.length > 1 ? intersections(items) : ['root']
  let lastContent = value

  // add identifiable className for restoreSelection
  return <ContentEditable className={'editable editable-' + items.join('-')} html={value} ref={ref}
    onKeyDown={e => {
      // ref is always null here

      lastContent = e.target.textContent

      // use e.target.textContent
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.textContent === '') {
        e.preventDefault()
        dispatch({ type: 'existingItemDelete', value: '' })
        // setTimeout(() => {
        //   restoreSelection(context.concat(prevValue), dispatch)
        // }, 50)
      }
      else if (e.key === 'Enter') {
        e.preventDefault()

        // if shift key is pressed, add a child instead of a sibling
        const newChild = e.shiftKey

        // get characters after cursor
        // const el = ref.current
        // const range = document.createRange()
        // const sel = window.getSelection()
        // const newValue = value.slice(sel.anchorOffset + sel.rangeCount - 1)
        const newValue = ''

        dispatch({ type: 'newItemSubmit', context: newChild ? items : context, rank: newChild ? 0 : getRankAfter(e.target.textContent, context), value: newValue, ref: ref.current })

        setTimeout(() => {
          restoreSelection((newChild ? items : intersections(items)).concat(newValue), dispatch)
        }, 100)
      }
    }}
    onFocus={() => restoreSelection(items, dispatch)}
    onChange={e => {
      // NOTE: Do not use ref.current here as it not accurate after newItemSubmit
      dispatch({ type: 'existingItemInput', context, oldValue: lastContent, newValue: e.target.value })
      lastContent = e.target.value
    }}
  />
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
  const ref = React.createRef()
  return <div>
    <h3 className='child-heading' style={{ display: !editing ? 'none' : null}}>
      <span contentEditable ref={ref} className='add-new-item'
        onKeyDown={e => {
          if (e.key === 'Enter') {
            dispatch({ type: 'newItemSubmit', context, rank: getNextRank(context), value: e.target.textContent, ref: ref.current })
          }
          else if (e.key === 'Escape') {
            dispatch({ type: 'newItemCancel', ref: ref.current })
          }
        }}
        onBlur={e => {
          dispatch({ type: 'newItemCancel', ref: ref.current })
        }}
      />
      {<Superscript items={[editingContent]} showSingle={true} />}
    </h3>
    {!editing ? <span className='add-icon' onClick={() => dispatch({ type: 'newItemEdit', context, ref: ref.current })}>+</span> : null}
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
