import { ABSOLUTE_TOKEN, EM_TOKEN, MODALS, HOME_TOKEN, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
// import { canShowModal } from '../selectors'
import { hashContext, hashThought, /* isDocumentEditable */ never, parseJsonSafe, timestamp } from '.'
import { Timestamp, ThoughtsInterface, State } from '../@types'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
/** Safely gets a value from localStorage if it is in the environment. */
const getLocal = (key: string) => {
  if (typeof localStorage === 'undefined') return undefined
  return localStorage.getItem(key)
}

/** Generates an initial ThoughtsInterface with the root and em contexts. */
export const initialThoughts = (created: Timestamp = timestamp()): ThoughtsInterface => {
  const HOME_TOKEN_HASH = hashContext([HOME_TOKEN])
  const ABSOLUTE_TOKEN_HASH = hashContext([ABSOLUTE_TOKEN])
  const EM_TOKEN_HASH = hashContext([EM_TOKEN])

  const contextIndex = {
    [HOME_TOKEN_HASH]: {
      id: HOME_TOKEN_HASH,
      value: HOME_TOKEN,
      context: [HOME_TOKEN],
      children: [],
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never(),
    },
    [ABSOLUTE_TOKEN_HASH]: {
      id: ABSOLUTE_TOKEN_HASH,
      value: ABSOLUTE_TOKEN,
      context: [ABSOLUTE_TOKEN],
      children: [],
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never(),
    },
    [EM_TOKEN_HASH]: {
      id: EM_TOKEN_HASH,
      value: EM_TOKEN,
      context: [EM_TOKEN],
      children: [],
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never(),
    },
  }

  const thoughtIndex = {
    [hashThought(HOME_TOKEN)]: {
      value: HOME_TOKEN,
      contexts: [],
      // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
      created,
      lastUpdated: never(),
    },
    [hashThought(ABSOLUTE_TOKEN)]: {
      value: ABSOLUTE_TOKEN,
      contexts: [],
      // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
      created,
      lastUpdated: never(),
    },
    // this will get populated by importText in loadLocalState
    // unfortunately that's the best way currently to create nested thoughts and ensure that thoughtIndex and contextIndex are correct
    [hashThought(EM_TOKEN)]: {
      value: EM_TOKEN,
      contexts: [],
      created,
      lastUpdated: never(),
    },
  }

  return {
    contextIndex,
    thoughtIndex,
  }
}

/** Generates the initial state of the application. */
export const initialState = (created: Timestamp = timestamp()) => {
  const state: State = {
    authenticated: false,
    // eslint-disable-next-line no-mixed-operators
    autologin: getLocal('autologin') === 'true',
    contextViews: {},
    cursor: null,
    cursorBeforeSearch: null,
    cursorBeforeQuickAdd: null,
    cursorHistory: [],
    cursorInitialized: false, // tracks if the cursor has been restored from the url on first load and ensures it only happens once
    cursorOffset: 0,
    dragInProgress: false,
    editableNonce: 0,
    editing: null,
    editingValue: null,
    enableLatestShorcutsDiagram: false,
    expanded: {},
    fontSize: +(getLocal('fontSize') || 10),
    expandedBottom: {},
    expandHoverBottomPaths: {},
    invalidState: false,
    inversePatches: [],
    isLoading: true,
    isPushing: false,
    latestShortcuts: [],
    modals: {},
    noteFocus: false, // true if a note has the browser selection
    patches: [],
    recentlyEdited: {},
    resourceCache: {},
    schemaVersion: SCHEMA_LATEST,
    scrollPrioritized: false,
    search: null,
    remoteSearch: false,
    searchContexts: null,
    showHiddenThoughts: false,
    showSidebar: false,
    showSplitView: false,
    showTopControls: true,
    showBreadcrumbs: true,
    // eslint-disable-next-line no-mixed-operators
    splitPosition: parseJsonSafe(getLocal('splitPosition') || null, 0),
    rootContext: [HOME_TOKEN],
    /* status:
      'disconnected'   Logged out or yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'loading'        Connected, authenticated, and waiting for first user data payload.
      'loaded'         User data payload received (may or may not be offline).
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    pushQueue: [],
    thoughts: initialThoughts(created),
    toolbarOverlay: null,
  }
  Object.keys(MODALS).forEach(key => {
    // initial modal states
    state.modals[MODALS[key]] = {
      // eslint-disable-next-line no-mixed-operators
      complete: globals.disableTutorial || JSON.parse(getLocal('modal-complete-' + MODALS[key]) || 'false'),
    }
  })

  // welcome modal
  state.showModal = 'welcome'

  return state
}
