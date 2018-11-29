/* eslint-disable jsx-a11y/accessible-emoji */
import * as pkg from '../package.json'
import './App.css'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'
// import * as emojiStrip from 'emoji-strip'
import logo from './logo-180x180.png'
import logoDark from './logo-dark-180x180.png'
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

const HELPER_REMIND_ME_LATER_DURATION = 1000 * 60 * 60 * 2 // 2 hours

const FADEOUT_DURATION = 400

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

let globalCounter = 0
const globalCount = () => <span className='debug'> {globalCounter = (globalCounter + 1) % 1000}</span>

// parses the items from the url
const decodeItemsUrl = () => {
  const urlComponents = window.location.pathname.slice(1)
  return urlComponents
    ? urlComponents.split('/').map(component => window.decodeURIComponent(component))
    : ['root']
}

const encodeItemsUrl = (items, from) =>
  '/' + (isRoot(items)
    ? ''
    : items.map(item =>
      window.encodeURIComponent(item)).join('/')) +
      (from && from.length > 0
        ? '?from=' + window.encodeURIComponent(from.join('/'))
        : ''
    )

const getFromFromUrl = () => {
  return window.location.search
    ? window.decodeURIComponent(window.location.search.slice(1).split('=')[1])
      .split('/')
      .map(item => window.decodeURIComponent(item))
    : null
}

const timestamp = () => (new Date()).toISOString()

/** Equality for lists of lists. */
const equalArrays = (a, b) =>
  a === b ||
  (a && b &&
  a.length === b.length &&
  a.every && b.every &&
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB)))

const equalItemRanked = (a, b) =>
  a === b || (a && b && a.key === b.key && a.rank === b.rank)

/** Returns the index of the first element in list that starts with items. */
const deepIndexContains = (items, list) => {
  for(let i=0; i<list.length; i++) {
    // NOTE: this logic is probably not correct. It is unclear why the match is in the front of the list sometimes and at the end other times. It depends on from. Nevertheless, it is "working" at least for typical use cases.
    if (
      // items at beginning of list
      equalArrays(items, list[i].slice(0, items.length)) ||
      // items at end of list
      equalArrays(items, list[i].slice(list[i].length - items.length))
    ) return i
  }
  return -1
}

// gets a unique list of parents
// const uniqueParents = memberOf => {
//   const output = []
//   const dict = {}
//   for (let i=0; i<memberOf.length; i++) {
//     let key = memberOf[i].context.join('___SEP___')
//     if (!dict[key]) {
//       dict[key] = true
//       output.push(memberOf[i])
//     }
//   }
//   return output
// }

const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))

/** Sums the length of all items in the list of items. */
const sumChildrenLength = children => children.reduce((accum, child) => accum + child.key.length, 0)

// sorts the given item to the front of the list
const sortToFront = (items, list) => {
  if (list.length === 0) return []
  const i = deepIndexContains(items, list)
  if (i === -1) throw new Error(`[${items}] not found in [${list.map(items => '[' + items + ']')}]`)
  return [].concat(
    [list[i]],
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

/** Returns a list of unique contexts that the given item is a member of. */
const getParents = (items) => {
  const key = signifier(items)
  const cache = {}
  if (!exists(items)) {
    console.error(`Unknown key: "${key}", from context: ${items.join(',')}`)
    return []
  }
  return (store.getState().data[key].memberOf || [])
    .filter(member => {
      const exists = cache[encodeItems(member.context)]
      cache[encodeItems(member.context)] = true
      // filter out items that exist
      return !exists
    })
    .map(member => member.context || member) // TEMP: || member for backwards compatibility
}

/** Returns a subset of items from the start to the given item (inclusive) */
const ancestors = (items, item) => items.slice(0, items.indexOf(item) + 1)

/** Returns a subset of items without all ancestors up to the given time (exclusive) */
// const disown = (items, item) => items.slice(items.indexOf(item))

/** Returns a subset of items without all ancestors up to the given time (exclusive) */
const unroot = (items, item) => isRoot(items.slice(0, 1))
  ? items.slice(1)
  : items

/** Returns true if the items or itemsRanked is the root item. */
const isRoot = items => items.length === 1 && items[0] && (items[0].key === 'root' || items[0] === 'root')

// generates a flat list of all descendants
const getDescendants = (items, recur/*INTERNAL*/) => {
  const children = getChildrenWithRank(items)
  // only append current item in recursive calls
  return (recur ? [signifier(items)] : []).concat(
    flatMap(children, child => getDescendants(items.concat(child.key), true))
  )
}

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
          isMatch: equalArrays(items, member.context || member)
        }
      })
    )
    // filter out non-matches
    .filter(match => match.isMatch)
    // sort by rank
    .sort(compareByRank)
}

// gets a new rank before the given item in a list but after the previous item
const getRankBefore = (value, context) => {
  const children = getChildrenWithRank(context)
  const i = children.findIndex(child => child.key === value)

  const prevChild = children[i - 1]
  const nextChild = children[i]

  const rank = prevChild
    ? (prevChild.rank + nextChild.rank) / 2
    : nextChild.rank - 1

  return rank
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

// gets an items's previous sibling with its rank
const prevSibling = (value, context) => {
  const siblings = getChildrenWithRank(context)
  let prev
  siblings.find(child => {
    if (child.key === value) {
      return true
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}

// gets a rank that comes before all items in a context
const getPrevRank = (items, data) => {
  const children = getChildrenWithRank(items, data)
  return children.length > 0
    ? children[0].rank - 1
    : 0
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
      .some(parent => equalArrays(items, parent))
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

/** Removes the item from a given context. */
const removeContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return {
      value: item.value,
      memberOf: item.memberOf.filter(parent =>
        !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
      ),
      lastUpdated: timestamp()
    }
}

// encode the items (and optionally rank) as a string for use in a className
const encodeItems = (items, rank) => items
  .map(item => item ? item.replace(' ', '_') : '')
  .join('__SEP__')
  + (rank ? '__SEP__' + rank : '')

/** Returns the editable DOM node of the given items */
const editableNode = (items, rank) => {
  return document.getElementsByClassName('editable-' + encodeItems(items, rank))[0]
}

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false

// restores the selection to a given editable item
// and then dispatches setCursor
const restoreSelection = (itemsRanked, offset, dispatch) => {

  const items = itemsRanked.map(child => child.key)

  // only re-apply the selection the first time
  if (!disableOnFocus) {

    disableOnFocus = true

    // use current focusOffset if not provided as a parameter
    let focusOffset = offset != null
      ? offset
      : window.getSelection().focusOffset

    dispatch({ type: 'setCursor', itemsRanked })

    // re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        disableOnFocus = false
      }, 0)

      // re-apply the selection
      const el = editableNode(items, signifier(itemsRanked).rank)
      if (!el) {
        console.error(`Could not find element: "editable-${encodeItems(items, signifier(itemsRanked).rank)}"`)
        return
        // throw new Error(`Could not find element: "editable-${encodeItems(items)}"`)
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
  focus: decodeItemsUrl(),
  from: getFromFromUrl(),
  data: {
    root: {}
  },
  settings: {
    dark: JSON.parse(localStorage['settings-dark'] || 'false')
  },
  // cheap trick to re-render when data has been updated
  dataNonce: 0,
  helper: {
    home: {
      complete: JSON.parse(localStorage['helper-complete-home'] || 'false'),
      hideuntil: JSON.parse(localStorage['helper-hideuntil-home'] || '0')
    }
  }
}

// load data from localStorage
for(let key in localStorage) {
  if (key.startsWith('data-')) {
    const value = key.substring(5)
    initialState.data[value] = JSON.parse(localStorage[key])
  }
}

const appReducer = (state = initialState, action) => {
  // console.info('ACTION', action)
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
      if (equalArrays(state.focus, action.to) && equalArrays([].concat(getFromFromUrl()), [].concat(action.from))) return state
      if (action.history !== false) {
        window.history[action.replace ? 'replaceState' : 'pushState'](
          state.focus,
          '',
          encodeItemsUrl(action.to, action.from)
        )
      }
      return {
        cursor: [],
        focus: action.to,
        from: action.from
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
          memberOf: item.memberOf,
          lastUpdated: timestamp()
        }, null, true)

        if (action.ref) {
          action.ref.textContent = ''
        }
      }, RENDER_DELAY)

      return {
        dataNonce: state.dataNonce + 1
      }
    },

    // set both cursor (the transcendental signifier) and cursorEditing (the live value during editing)
    // the other contexts superscript uses cursorEditing when it is available
    setCursor: () => ({
      cursor: action.itemsRanked,
      cursorEditing: action.itemsRanked
    }),

    // context, oldValue, newValue
    existingItemChange: () => {

      // items may exist for both the old value and the new value
      const itemOld = state.data[action.oldValue]
      const itemCollision = state.data[action.newValue]
      const items = unroot(action.context).concat(action.oldValue)
      const itemsNew = unroot(action.context).concat(action.newValue)

      const itemNew = {
        value: action.newValue,
        memberOf: (itemCollision ? itemCollision.memberOf || [] : []).concat({
          context: action.context,
          rank: action.rank // TODO: Add getNextRank(itemCillision.memberOf) ?
        }),
        lastUpdated: timestamp()
      }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {

        // remove from old context
        const newOldItem = removeContext(itemOld, action.context, action.rank)
        if (newOldItem.memberOf.length > 0) {
          sync(action.oldValue, newOldItem)
        }
        // or remove entirely if it was the only context
        else {
          del(action.oldValue)
          delete state.data[action.oldValue]
        }

        // update item immediately for next calculations
        state.data[action.newValue] = itemNew
        sync(action.newValue, itemNew, null, false)

        // recursive function to change item within the context of all descendants
        // the inheritance is the list of additional ancestors built up in recursive calls that must be concatenated to itemsNew to get the proper context
        const changeDescendants = (items, inheritance=[]) => {

          getChildrenWithRank(items).forEach(child => {
            const childItem = state.data[child.key]

            // remove and add the new of the child.key
            const childNew = removeContext(childItem, items, child.rank)
            childNew.memberOf.push({
              context: itemsNew.concat(inheritance),
              rank: child.rank
            })

            sync(child.key, childNew)

            // RECUR
            changeDescendants(items.concat(child.key), inheritance.concat(child.key))
          })
        }

        setTimeout(() => {
          changeDescendants(items)
        })

      })

      return {
        data: state.data,
        // update cursorEditing so that the other contexts superscript will re-render
        cursorEditing: itemsNew
      }
    },

    existingItemDelete: () => {

      const items = unroot(action.context).concat(action.value)

      // remove the item from the context
      // (use setTimeout get around requirement that reducers cannot dispatch actions)
      setTimeout(() => {
        del(action.value, null, true)
      })

      // remove item from memberOf of each child
      setTimeout(() => {
        getChildrenWithRank(items).forEach(child => {
          const childItem = state.data[child.key]

          // remove deleted parent
          const childNew = removeContext(childItem, items, child.rank)

          // modify the parents[i] of the child.key
          if (childNew.memberOf.length > 0) {
            sync(child.key, childNew)
          }
          // or if this was the last parent, delete the child
          else {
            // dispatch an event rather than call del directly in order to delete recursively for all orphan'd descendants
            store.dispatch({ type: 'existingItemDelete', value: child.key, context: items })
            // del(child.key, null, true)
          }
        })
      })

      return {
        dataNonce: state.dataNonce + 1
      }
    },

    dark: () => {
      localStorage['settings-dark'] = !state.settings.dark
      return {
        settings: Object.assign({}, state.settings, { dark: !state.settings.dark })
      }
    },

    helperComplete: ({ id }) => {
      localStorage['helper-complete-' + id] = true
      return {
        helper: Object.assign({}, state.helper, {
          [id]: Object.assign({}, state.helper[id], {
            complete: true
          })
        })
      }
    },

    helperRemindMeLater: ({ id, duration }) => {
      const time = Date.now() + duration
      localStorage['helper-hideuntil-' + id] = time
      return {
        helper: Object.assign({}, state.helper, {
          [id]: Object.assign({}, state.helper[id], {
            hideuntil: time
          })
        })
      }
    }

  })[action.type] || (() => state))(action))
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
const sync = (key, item={}, localOnly, bumpNonce, callback) => {

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
    }, callback)
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
    to: decodeItemsUrl(),
    from: getFromFromUrl(),
    history: false
  })
})

/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect((
    { dataNonce, cursor, focus, from, status, user, settings }) => (
    { dataNonce, cursor, focus, from, status, user, settings }))((
    { dataNonce, cursor, focus, from, status, user, settings, dispatch }) => {

  const directChildren = getChildrenWithRank(focus)

  const subheadings = directChildren.length > 0
    ? [focus]
    : sortToFront(from || focus, getDerivedChildren(focus))//.sort(sorter)

  // if there are derived children but they are all empty, then bail and redirect to the global context
  if (emptySubheadings(focus, subheadings)) {
    setTimeout(() => {
      dispatch({ type: 'navigate', to: [signifier(focus)], replace: true })
    }, 0)
    return null
  }

  const otherContexts = getParents(focus)

  return <div ref={() => {
    document.body.classList[settings.dark ? 'add' : 'remove']('dark')
  }} className={
    'container' +
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    (/Mobile/.test(navigator.userAgent) ? ' mobile' : '') +
    (/Chrome/.test(navigator.userAgent) ? ' chrome' : '') +
    (/Safari/.test(navigator.userAgent) ? ' safari' : '')
  }>
    <div className={'content' + (from ? ' from' : '')}>
      <HomeLink focus={focus} />
      <Status status={status} />

      { /* Subheadings */ }
      <div>
        { /* TODO: Why is this separate? */ }
        {subheadings.length === 0 ? <div>

          { /* Subheading */ }
          {!isRoot(focus) ? <Subheading items={focus} /> : null}

          { /* New Item */ }
          <NewItem context={focus} />
        </div> : null}

        {subheadings.map((items, i) => {

          // fill the starting items with their rank
          const itemsRanked = items.map(item => ({ key: item, rank: 0 }))

          const children = (directChildren.length > 0
            ? directChildren
            : getChildrenWithRank(items)
          )//.sort(sorter)

          // get a flat list of all grandchildren to determine if there is enough space to expand
          // const grandchildren = flatMap(children, child => getChildren(items.concat(child)))

          return i === 0 || /*otherContexts.length > 0 || directChildren.length > 0 ||*/ from ? <div key={i}>
            { /* Subheading */ }
            {!isRoot(focus) ? <Subheading items={items} /> : null}

            {/* Subheading Children
                Note: Override directChildren by passing children
            */}
            <Children focus={focus} cursor={cursor} itemsRanked={itemsRanked} children={children} expandable={true} />

            { /* New Item */ }
            <NewItem context={items} />

            { /* Other Contexts */ }
            {i === 0 && otherContexts.filter(items => !equalArrays(items, focus)).length > 1 /*&& (directChildren.length > 0 || from)*/ ? <div className='other-contexts'>
                <Link items={directChildren.length > 0 || !from ? [signifier(focus)] : from.concat(focus)}
                  label={<span>{otherContexts.length - 1} other context{otherContexts.length > 2 ? 's' : ''} <span className={directChildren.length > 0 ? 'down-chevron' : 'up-chevron'}>{directChildren.length > 0 ? '⌄' : '⌃'}</span></span>}
                  from={focus.length > 1 ? intersections(focus) : null}
              />
              </div> : null}
          </div> : null
        })}
      </div>
    </div>

    <ul className='footer list-none'>
      <li><a className='settings-dark' onClick={() => dispatch({ type: 'dark' })}>Dark Mode</a> | <a className='settings-logout' onClick={() => firebase && firebase.auth().signOut()}>Log Out</a></li><br/>
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

const HomeLink = connect(state => ({
  dark: state.settings.dark,
}))(({ dark, helperHome, focus, dispatch }) =>
  <span className='home'>
    <a onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'><img className='logo' src={dark ? logoDark : logo} alt='em' width='24' /></span></a>
    {!isRoot(focus) ? <Helper id='home' title='Tap the "em" icon to return to the home context.' /> : null}
  </span>
)

const Subheading = ({ items, cursor=[] }) => {
  // extend items with the items that are hidden from autofocus
  const hiddenItems = cursor.slice(items.length, cursor.length - MAX_DISTANCE_FROM_CURSOR + 1)
  const extendedItems = items.concat(hiddenItems)
  return <h2>
    {extendedItems.map((item, i) => {
      const subitems = ancestors(extendedItems, item)
      return <span key={i} className={item === signifier(extendedItems) ? 'subheading-focus' : null}>
        {i > 0 ? <span> + </span> : null}
        <Link items={subitems} />
        <Superscript items={subitems} />
      </span>
    })}
  </h2>
}

/** A recursive child element that consists of a <li> containing an <h3> and <ul> */
const Child = ({ focus, cursor=[], itemsRanked, rank, depth=0, count=0 }) => {

  const items = itemsRanked.map(child => child.key)
  const children = getChildrenWithRank(items)
  const numDescendantCharacters = getDescendants(items)
    .reduce((charCount, child) => charCount + child.length, 0)

  return <li className={
    'child' +
    (children.length === 0 ? ' leaf' : '')
  }>
    <h3 className='child-heading'>
      <Editable focus={focus} itemsRanked={itemsRanked} rank={rank} />
      <Superscript items={items} />
      <span className={'depth-bar' + (getParents(items).length > 1 ? ' has-other-contexts' : '')} style={{ width: numDescendantCharacters ? Math.log(numDescendantCharacters) + 2 : 0 }} />
    </h3>{globalCount()}

    { /* Recursive Children */ }
    <Children focus={focus} cursor={cursor} itemsRanked={itemsRanked} children={children} count={count} depth={depth} />
  </li>
}

// NOTE: focus is only needed for <Editable> to determine where to restore the selection after delete
const Children = connect((state, props) => {
  return {
    // track the transcendental identifier if editing to trigger expand/collapse
    isEditing: (state.cursor || []).find(cursorItemRanked => equalItemRanked(cursorItemRanked, signifier(props.itemsRanked)))
  }
})(({ isEditing, focus, cursor=[], itemsRanked, children, expandable, count=0, depth=0 }) => {

  const show = (isRoot(itemsRanked) || isEditing || expandable) &&
    children.length > 0 &&
    count + sumChildrenLength(children) <= NESTING_CHAR_MAX

  // embed data-items-length so that distance-from-cursor can be set on each ul when there is a new cursor location (autofocus)
  // unroot items so ['root'] is not counted as 1
  return show ? <div>
    <ul
      data-items-length={unroot(itemsRanked).length}
      className='children'
    >
      {children.map((child, i) =>
        <Child key={i} focus={focus} cursor={cursor} itemsRanked={unroot(itemsRanked).concat(child)} rank={child.rank} count={count + sumChildrenLength(children)} depth={depth + 1} />
      )}
    </ul>
    {globalCount()}
  </div> : null
})

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, from, dispatch }) => {
  const value = label || signifier(items)
  return <a href={encodeItemsUrl(items, from)} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from: e.shiftKey ? decodeItemsUrl() : from })
  }}>{value}</a>
})

const Editable = connect()(({ focus, itemsRanked, rank, from, cursor, dispatch }) => {
  const items = itemsRanked.map(child => child.key)
  const value = signifier(items)
  const ref = React.createRef()
  const context = items.length > 1 ? intersections(items) : ['root']
  let valueLive = value
  let itemsLive = items
  let itemsRankedLive = itemsRanked
  const baseDepth = decodeItemsUrl().length

  // add identifiable className for restoreSelection
  return <ContentEditable className={'editable editable-' + encodeItems(items, rank)} html={value} ref={ref}
    onKeyDown={e => {
      // ref is always null here

      valueLive = e.target.textContent
      itemsLive = intersections(items).concat(valueLive)
      itemsRankedLive = intersections(itemsRanked).concat({ key: valueLive, rank })

      /**************************
       * Delete
       **************************/
      if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') && e.target.textContent === '') {
        e.preventDefault()
        const prev = prevSibling('', context)
        dispatch({ type: 'existingItemDelete', value: '', context })

        // normal delete: restore selection to prev item
        if (prev) {
          restoreSelection(
            intersections(itemsRanked).concat(prev),
            prev.key.length,
            dispatch
          )
        }
        else if (signifier(context) === signifier(focus)) {
          const next = getChildrenWithRank(context)[1]

          // delete from head of focus: restore selection to next item
          if (next) {
            restoreSelection(intersections(itemsRanked).concat(next), 0, dispatch)
          }

          // delete last item in focus
          else {
            dispatch({ type: 'setCursor' })
          }
        }
        // delete from first child: restore selection to context
        else {
          const contextRanked = items.length > 1 ? intersections(itemsRanked) : [{ key: 'root', rank: 0 }]
          restoreSelection(
            contextRanked,
            signifier(context).length,
            dispatch
          )
        }
      }

      /**************************
       * Enter
       **************************/
      else if (e.key === 'Enter') {
        e.preventDefault()

        // if shift key is pressed, add a child instead of a sibling
        const insertNewChild = e.metaKey
        const insertBefore = e.shiftKey
        const newRank = insertNewChild
          ? (insertBefore ? getPrevRank : getNextRank)(itemsLive)
          : (insertBefore ? getRankBefore : getRankAfter)(e.target.textContent, context)

        dispatch({
          type: 'newItemSubmit',
          context: insertNewChild ? itemsLive : context,
          rank: newRank,
          value: '',
          ref: ref.current
        })

        disableOnFocus = true
        setTimeout(() => {
          // track the transcendental identifier if editing
          disableOnFocus = false
          restoreSelection((insertNewChild ? itemsRankedLive : intersections(itemsRankedLive)).concat({ key: '', rank: newRank }), 0, dispatch)
        }, RENDER_DELAY)
      }
    }}
    onFocus={e => {

      // if the focused node is destroyed in the re-render, the selection needs to be restored
      // delay until after the render
      if (!disableOnFocus) {

        disableOnFocus = true

        // for some reason (?) only cursorEditing (before the timeout) contains the correct value when editing; not items, itemsLive (before or after) and not cursorEditing (after)
        const cursorEditing = store.getState().cursorEditing || itemsRanked

        setTimeout(() => {
          disableOnFocus = false
          // if the DOM node for the original items exists (e.g. sibling) restore it as-is
          // otherwise, assume that an ancestor was modified and recreate the new items

          restoreSelection(editableNode(items, rank)
            ? itemsRanked
            : cursorEditing.concat(itemsRanked.slice(cursorEditing.length))
          , null, dispatch)
        }, 0)

        dispatch({ type: 'setCursor', itemsRanked })

        // autofocus
        // update distance-from-cursor on each ul
        setTimeout(() => {
          const uls = document.getElementsByClassName('children')
          for (let i=0; i<uls.length; i++) {
            const ul = uls[i]
            const depth = +ul.getAttribute('data-items-length')
            const distance = Math.max(0,
              Math.min(MAX_DISTANCE_FROM_CURSOR,
                items.length - depth - baseDepth// + offset
              )
            )

            ul.classList.remove('distance-from-cursor-0', 'distance-from-cursor-1', 'distance-from-cursor-2', 'distance-from-cursor-3')
            ul.classList.add('distance-from-cursor-' + distance)
          }
        })
      }

    }}
    onChange={e => {
      // NOTE: Do not use ref.current here as it not accurate after newItemSubmit
      // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      if (e.target.value !== valueLive) {
        const item = store.getState().data[valueLive]
        if (item) {
          dispatch({ type: 'existingItemChange', context, oldValue: valueLive, newValue: e.target.value, rank })

          // keep track of the new items so the selection can be restored (see onFocus)
          valueLive = e.target.value
          itemsLive = intersections(items).concat(valueLive)
          itemsRankedLive = intersections(itemsRanked).concat({ key: valueLive, rank })
        }
      }
    }}
  />
})

// renders superscript if there are other contexts
const Superscript = connect((state, props) => {
  // track the transcendental identifier if editing
  const items = equalArrays(state.cursor, props.items) && exists(state.cursorEditing)
    ? state.cursorEditing
    : props.items
  return {
    numContexts: exists(items) && getParents(items).length
  }
})(({ items, numContexts, showSingle, dispatch }) => {
  // if (!items || items.length === 0 || !exists(items)) return null
  return numContexts > (showSingle ? 0 : 1)
    ? <sup className='num-contexts'><a onClick={() => {
        dispatch({ type: 'navigate', to: [signifier(items)], from: intersections(items) })
      }}>{numContexts}{globalCount()}</a></sup>
    : null
})

const NewItem = connect((state, props) => ({
    editingNewItem: state.cursor && equalArrays(
      state.cursor.map(child => child.key),
      unroot(props.context).concat('')
    )
}))(({ editingNewItem, context, dispatch }) => {
  const ref = React.createRef()

  return !editingNewItem ? <ul style={{ marginTop: 0 }} className='children-new'>
    <li className='leaf'><h3 className='child-heading'>
        <a className='add-new-item-placeholder'
          onClick={() => {
            const newRank = getNextRank(context)

            dispatch({
              type: 'newItemSubmit',
              context,
              rank: newRank,
              value: '',
              ref: ref.current
            })

            disableOnFocus = true
            setTimeout(() => {
              disableOnFocus = false
              restoreSelection(unroot(context).map(item => ({ key: item, rank: 0 })).concat({ key: '', rank: newRank }), 0, dispatch)
            }, RENDER_DELAY)

          }}
        >Add item</a>
      </h3>
    </li>
  </ul> : null
})

const Helper = connect((state, props) => {
  return {
    show: !state.helper[props.id].complete &&
      state.helper[props.id].hideuntil < Date.now()
  }
})(({ show, id, title, dispatch }) => {
  const ref = React.createRef()
  return show ? <div ref={ref} className={`helper helper-${id} arrow-left arrow-top animate`}>
      {title}
      <div className='helper-actions'><a onClick={() => {
        dispatch({ type: 'helperComplete', id })
      }}>Got it!</a> <a onClick={() => {
        ref.current.classList.add('animate-fadeout')
        setTimeout(() => {
          dispatch({ type: 'helperRemindMeLater', id, duration: HELPER_REMIND_ME_LATER_DURATION })
        }, FADEOUT_DURATION)
      }}>Remind me later</a></div>
      <a onClick={() => {
        ref.current.classList.add('animate-fadeout')
        setTimeout(() => {
          dispatch({ type: 'helperRemindMeLater', id, duration: 1000 })
        }, FADEOUT_DURATION)
      }}><span className='helper-close'>✕</span></a>
    </div> : null
  }
)

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
