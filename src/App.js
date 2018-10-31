/* eslint-disable jsx-a11y/accessible-emoji */
import * as pkg from '../package.json'
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

const MAX_DISTANCE_FROM_CURSOR = 3

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

// const debugRand = () => Math.floor(1000 * Math.random())

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

const timestamp = () => (new Date()).toISOString()

const deepEqual = (a, b) =>
  a === b ||
  (a && b &&
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB)))

const deepIndexOf = (item, list) => {
  for(let i=0; i<list.length; i++) {
    if (deepEqual(item, list[i])) return i
  }
  return -1
}

// gets a unique list of parents
const uniqueParents = memberOf => {
  const output = []
  const dict = {}
  for (let i=0; i<memberOf.length; i++) {
    let key = memberOf[i].context.join('___SEP___')
    if (!dict[key]) {
      dict[key] = true
      output.push(memberOf[i])
    }
  }
  return output
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
    console.error(`Unknown key: "${key}", from context: ${items.join(',')}`)
    return []
  }
  return (store.getState().data[key].memberOf || [])
    .map(member => member.context || member) // TEMP: || member for backwards compatibility
}

const subset = (items, item) => items.slice(0, items.indexOf(item) + 1)

const isRoot = items => items[0] === 'root'

// generates children with their ranking
// TODO: cache for performance, especially of the app stays read-only
const getChildrenWithRank = (items, data) => {
  data = data || store.getState().data
  return flatMap(Object.keys(data), key =>
    ((data[key] || []).memberOf || [])
      // .sort(compareByRank)
      // .map(member => { return member.context || member }) // TEMP: || member for backwards compatibility
      .map(member => {
        if (!member) {
          throw new Error(`Key "${key}" has  null parent`)
        }
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

// gets an items's previous sibling
const prevSibling = (value, context) => {
  const siblings = getChildren(context)
  return siblings[siblings.indexOf(value) - 1]
}

// gets the next rank at the end of a list
const getNextRank = (items, data) => {
  const children = getChildrenWithRank(items, data)
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

const distanceFromCursor = (cursor, items, offset=0) =>
  Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - items.length - getItemsFromUrl().length + offset)

/** Returns true if the item exists in the given context. */
const hasContext = (item, context) =>
  item && item.memberOf.some(parent => deepEqual(parent.context, context))

/** Removes the item from a given context. */
const removeContext = (item, context) => {
  return {
      value: item.value,
      memberOf: item.memberOf.filter(parent =>
        !deepEqual(parent.context, context)
      ),
      lastUpdated: timestamp()
    }
}

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false

// restores the selection to a given editable item
// and then dispatches existingItemFocus
const restoreSelection = (items, offset, dispatch) => {
  // only re-apply the selection the first time
  if (!disableOnFocus) {

    disableOnFocus = true
    let focusOffset = offset

    // 1. get the current focus offset unless it's being provided explicitly
    if (!offset) {
      setTimeout(() => {
        focusOffset = window.getSelection().focusOffset
      }, 0)
    }

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
        console.error(`Could not find element: "editable-${items.join('-')}"`)
        // dispatch({ type: 'existingItemFocus', items: ['root', 'a'] })
        return
        // throw new Error(`Could not find element: "editable-${items.join('-')}"`)
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
      lastUpdated: timestamp(),
      dataNonce: state.dataNonce + (action.bumpNonce ? 1 : 0)
    }),

    delete: () => {
      delete state.data[action.value]
      return {
        data: Object.assign({}, state.data),
        lastUpdated: timestamp(),
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
        // cursor refers to the original items
        cursor: action.items,

        // cursorEditing refers to the edited items
        cursorEditing: action.items
      }
    },

    existingItemInput: () => {

      // items may exist for both the old value and the new value
      const itemOld = state.data[action.oldValue]
      const itemCollision = state.data[action.newValue]
      const context = (action.context[0] === 'root' ? action.context.slice(1) : action.context)
      const items = context.concat(action.oldValue)
      const itemsNew = context.concat(action.newValue)
      const itemOldMaxRank = getNextRank(action.context, state.data)

      const itemNew = {
        value: action.newValue,
        // disjunction of old and new memberOf, with rank offset
        memberOf: uniqueParents(itemOld.memberOf.concat(itemCollision
          ? itemCollision.memberOf.map(parent =>
              Object.assign({}, parent, { rank: parent.rank + itemOldMaxRank })
            ) || []
          : []
        )),
        lastUpdated: timestamp()
      }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {

        // remove from old context
        const memberOfNew = itemOld.memberOf.filter(parent => !deepEqual(parent.context, context))
        const newOldItem = removeContext(action.oldValue, context)
        if (newOldItem.memberOfNew.length > 0) {
          sync(action.oldValue, newOldItem)
        }
        // or remove entirely if it was the only context
        else {
          del(action.oldValue)
          delete state.data[action.oldValue]
        }
        sync(action.newValue, itemNew)

      }, RENDER_DELAY)

      // update children's memberOf
      setTimeout(() => {
        const children = getChildren(items)
        children.forEach(childValue => {
          const childItem = state.data[childValue]
          let rank = 0
          // for(let i=0; i<parents.length; i++) {
            // if (deepEqual(parents[i].context, items)) {
              // modify the parents[i] of the childValue
              sync(childValue, {
                value: childItem.value,
                lastUpdated: childItem.lastUpdated,
                memberOf: childItem.memberOf
                  // remove the old parent
                  .filter(parent => {
                    if(deepEqual(parent.context, items)) {
                      rank = parent.rank
                      return false
                    }
                    else {
                      return true
                    }
                  })
                  // add the new parent
                  .concat({
                    context: itemsNew,
                    rank
                  })
              })
            // }
          // }
        })
      }, RENDER_DELAY)

      // modify state
      state.data[action.newValue] = itemNew

      return {
        data: state.data,
        lastUpdated: timestamp(),
        cursorEditing: context.concat(action.newValue)
      }
    },

    existingItemDelete: () => {

      const context = (action.context[0] === 'root' ? action.context.slice(1) : action.context)
      const items = context.concat(action.value)

      const item = state.data[action.value]

      // remove the item from the context
      // delete the item completely if it only had one context
      // (use setTimeout get around requirement that reducers cannot dispatch actions)
      setTimeout(() => {
        // console.log('memberOfNew', memberOfNew)
        // if (memberOfNew.length > 0) {
        //   sync(action.value, {
        //     value: action.value,
        //     lastUpdated: timestamp(),
        //     memberOf: memberOfNew
        //   })
        // }
        // else {
          del(action.value, null, true)
        // }
      })

      // remove item from memberOf of each child
      setTimeout(() => {
        const children = getChildren(items)
        children.forEach(childValue => {
          const childItem = state.data[childValue]

          // remove deleted parent
          const childNew = removeContext(childValue, items)
          // console.log('memberOfNew', memberOfNew)

          // modify the parents[i] of the childValue
          if (childNew.memberOf.length > 0) {
            sync(childValue, childNew)
          }
          // or if this was the last parent, delete the child
          else {
            // dispatch an event rather than call del directly in order to delete recursively for all orphan'd descendants
            store.dispatch({ type: 'existingItemDelete', value: childValue, context: items })
            // del(childValue, null, true)
          }
        })
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

// Set to offline mode in 5 seconds. Cancelled with successful login.
const offlineTimer = window.setTimeout(() => {
  store.dispatch({ type: 'status', value: 'offline' })
}, OFFLINE_TIMEOUT)

// firebase init
const firebase = window.firebase
if (firebase) {
  firebase.initializeApp(firebaseConfig)

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

      // init root if it does not exist (i.e. local = false)
      if (!value.data || !value.data['data-root']) {
        sync('root')
      }
      // otherwise sync all data locally
      else {
        syncAll(value.data)
      }
    })

  })
}

// delete from state, localStorage, and Firebase
const del = (key, localOnly, bumpNonce) => {

  const lastUpdated = timestamp()

  // state
  store.dispatch({ type: 'delete', value: key, bumpNonce })

  // localStorage
  localStorage.removeItem('data-' + key)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly && firebase) {
    store.getState().userRef.child('data/data-' + key).remove()
  }

}

// save to state, localStorage, and Firebase
const sync = (key, item={}, localOnly, bumpNonce) => {

  const lastUpdated = timestamp()
  const timestampedItem = Object.assign({}, item, { lastUpdated })

  // state
  store.dispatch({ type: 'data', item: timestampedItem, bumpNonce })

  // localStorage
  localStorage['data-' + key] = JSON.stringify(timestampedItem)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly && firebase) {
    store.getState().userRef.update({
      ['data/data-' + key]: timestampedItem,
      lastUpdated
    })
  }

}

// save all data to state and localStorage
const syncAll = data => {
  for (let key in data) {
    const item = data[key]
    const oldItem = store.getState().data[key.slice(5)]

    if (!oldItem || item.lastUpdated > oldItem.lastUpdated) {
      store.dispatch({ type: 'data', item })
      localStorage[key] = JSON.stringify(item)
    }
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
    { cursor=[], focus, from, editingNewItem, editingContent, status, user }) => (
    { cursor, focus, from, editingNewItem, editingContent, status, user }))((
    { cursor=[], focus, from, editingNewItem, editingContent, status, user, dispatch }) => {

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

  return <div className='container'>
    <div className={'content' + (from ? ' from' : '')}>
      <HomeLink />
      <Status status={status} />

      { /* Subheadings */ }
      <div>
        { /* TODO: Why is this separate? */ }
        {subheadings.length === 0 ? <div>

          { /* Subheading */ }
          {!isRoot(focus) ? <Subheading items={focus} cursor={cursor} /> : null}

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
            {!isRoot(focus) ? <Subheading items={items} cursor={cursor  } /> : null}

            { /* Subheading Children */ }
            <Children cursor={cursor} focus={focus} items={items} children={children} distanceFromCursorOffset={isRoot(focus) ? 1 : 0} expandable={(from && i === 0) || hasDirectChildren} />

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

    <ul className='footer list-none'>
      <li><a className='settings-logout' onClick={() => firebase && firebase.auth().signOut()}>Log Out</a></li><br/>
      <li><span className='dim'>Version: </span>{pkg.version}</li>
      {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
      {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid}</span></li> : null}
    </ul>

  </div>
})

const Status = ({ status }) => <div className='status'>
  {status === 'connecting' ? <span>Connecting...</span> : null}
  {status === 'offline' ? <span className='error'>Offline</span> : null}
</div>

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'><img src={logo} alt='em' width='24' /></span></a>
)

const Subheading = ({ items, cursor=[] }) => {
  // extend items with the items that are hidden from autofocus
  const hiddenItems = cursor.slice(items.length, cursor.length - MAX_DISTANCE_FROM_CURSOR + 1)
  const extendedItems = items.concat(hiddenItems)
  return <h2>
    {extendedItems.map((item, i) => {
      const subitems = subset(extendedItems, item)
      return <span key={i} className={item === signifier(extendedItems) ? 'subheading-focus' : null}>
        {i > 0 ? <span> + </span> : null}
        <Link items={subitems} />
        <Superscript items={subitems} />
      </span>
    })}
  </h2>
}

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
      <Superscript items={items} cursor={cursor} />
      <span className='depth-bar' style={{ width: children.length * 2 }} />
    </h3>

    { /* Recursive Children */ }
    {expanded ? <Children cursor={cursor} focus={items} items={items} children={children} count={count} depth={depth} /> : null}
  </li>
})

const Children = ({ cursor, focus, items, children, count=0, depth=0, distanceFromCursorOffset=0, expandable=true }) => {
  return <ul className={'children distance-from-cursor-' + distanceFromCursor(cursor, items, distanceFromCursorOffset)}>
    {children.map((child, i) => {
      const childItems = (isRoot(focus) ? [] : items).concat(child)
      return <Child key={i} cursor={cursor} items={childItems} count={count + sumLength(children)} depth={depth + 1} expandable={expandable && cursor.includes(child)} />
    })}
    </ul>
}

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
        const prev = prevSibling('', context)
        dispatch({ type: 'existingItemDelete', value: '', context })
        restoreSelection(intersections(items).concat(prev || []), (prev || signifier(context)).length, dispatch)
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

        const cursorEditing = deepEqual(store.getState().cursor, items) ? store.getState().cursorEditing || items : items

        dispatch({ type: 'newItemSubmit', context: newChild ? cursorEditing : context, rank: newChild ? getNextRank(context) : getRankAfter(e.target.textContent, context), value: newValue, ref: ref.current })

        setTimeout(() => {
          // track the transcendental identifier if editing
          restoreSelection((newChild ? cursorEditing : intersections(cursorEditing)).concat(newValue), 0, dispatch)
        }, 100)
      }
    }}
    onFocus={e => {
      dispatch({ type: 'existingItemFocus', items })
    }}
    onChange={e => {
      // NOTE: Do not use ref.current here as it not accurate after newItemSubmit
      // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      if (e.target.value !== lastContent) {
        const item = store.getState().data[lastContent]
        if (item) {
          dispatch({ type: 'existingItemInput', context, oldValue: lastContent, newValue: e.target.value })
          lastContent = e.target.value
        }
      }
    }}
  />
})

// renders superscript if there are other contexts
const Superscript = connect((state, props) => {
  return {
    // track the transcendental identifier if editing
    cursorEditing: deepEqual(state.cursor, props.items) ? state.cursorEditing || props.items : props.items
  }
})(({ items, cursorEditing, cursor, showSingle, dispatch }) => {
  if (!cursorEditing || cursorEditing.length === 0 || !exists(cursorEditing)) return null
  const otherContexts = getParents(cursorEditing)
  return otherContexts.length > (showSingle ? 0 : 1)
    ? <sup className='num-contexts'>{otherContexts.length}{deepEqual(cursor, items) ? <span onClick={() => {
      dispatch({ type: 'navigate', to: [signifier(cursorEditing)], from: intersections(cursorEditing) })
    }}> ↗</span>/*⬀⬈↗︎⬏*/ : null}</sup>
    : null
})

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
