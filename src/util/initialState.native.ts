import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Timestamp from '../@types/Timestamp'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, MODALS, ROOT_PARENT_ID, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
import hashThought from './hashThought'
import never from './never'
import parseJsonSafe from './parseJsonSafe'
import { getSessionId } from './sessionManager'
import timestamp from './timestamp'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
/** Safely gets a value from localStorage if it is in the environment. */
const getLocal = (key: string) => {
  if (typeof localStorage === 'undefined') return undefined
  return localStorage.getItem(key)
}

/** Generates an initial ThoughtIndices with the root and em contexts. */
const initialThoughts = (created: Timestamp = timestamp()): ThoughtIndices => {
  const HOME_TOKEN_HASH = HOME_TOKEN
  const ABSOLUTE_TOKEN_HASH = ABSOLUTE_TOKEN
  const EM_TOKEN_HASH = EM_TOKEN

  const thoughtIndex: Index<Thought> = {
    [HOME_TOKEN_HASH]: {
      id: HOME_TOKEN_HASH as ThoughtId,
      value: HOME_TOKEN,
      childrenMap: {},
      parentId: ROOT_PARENT_ID as ThoughtId,
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never(),
      rank: 0,
      updatedBy: getSessionId(),
    },
    [ABSOLUTE_TOKEN_HASH]: {
      id: ABSOLUTE_TOKEN_HASH as ThoughtId,
      value: ABSOLUTE_TOKEN,
      parentId: ROOT_PARENT_ID as ThoughtId,
      childrenMap: {},
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never(),
      rank: 0,
      updatedBy: getSessionId(),
    },
    [EM_TOKEN_HASH]: {
      id: EM_TOKEN_HASH as ThoughtId,
      value: EM_TOKEN,
      parentId: ROOT_PARENT_ID as ThoughtId,
      childrenMap: {},
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never(),
      rank: 0,
      updatedBy: getSessionId(),
    },
  }

  const lexemeIndex: Index<Lexeme> = {
    [hashThought(HOME_TOKEN)]: {
      lemma: HOME_TOKEN,
      contexts: [],
      // set to beginning of epoch to ensure that server lexemeIndex is always considered newer from init lexemeIndex
      created,
      lastUpdated: never(),
      updatedBy: getSessionId(),
    },
    [hashThought(ABSOLUTE_TOKEN)]: {
      lemma: ABSOLUTE_TOKEN,
      contexts: [],
      // set to beginning of epoch to ensure that server lexemeIndex is always considered newer from init lexemeIndex
      created,
      lastUpdated: never(),
      updatedBy: getSessionId(),
    },
    // this will get populated by importText in loadLocalState
    // unfortunately that's the best way currently to create nested thoughts and ensure that lexemeIndex and thoughtIndex are correct
    [hashThought(EM_TOKEN)]: {
      lemma: EM_TOKEN,
      contexts: [],
      created,
      lastUpdated: never(),
      updatedBy: getSessionId(),
    },
  }

  return {
    thoughtIndex,
    lexemeIndex,
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
    cursorCleared: false,
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
    isLoading: true,
    isPushing: false,
    latestShortcuts: [],
    modals: {},
    noteFocus: false, // true if a note has the browser selection
    pushQueue: [],
    recentlyEdited: {},
    redoPatches: [],
    resourceCache: {},
    rootContext: [HOME_TOKEN],
    /* status:
      'disconnected'   Logged out or yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'loading'        Connected, authenticated, and waiting for first user data payload.
      'loaded'         User data payload received (may or may not be offline).
      'offline'        Disconnected and working in offline mode.
    */
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
    status: 'disconnected',
    thoughts: initialThoughts(created),
    toolbarOverlay: null,
    undoPatches: [],
  }
  Object.keys(MODALS).forEach(key => {
    // initial modal states
    state.modals[key] = {
      // eslint-disable-next-line no-mixed-operators
      complete: globals.disableTutorial || JSON.parse(getLocal('modal-complete-' + key) || 'false'),
    }
  })

  // welcome modal
  state.showModal = 'welcome'

  return state
}

export default initialThoughts
