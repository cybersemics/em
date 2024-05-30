import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtIndices from '../@types/ThoughtIndices'
import Timestamp from '../@types/Timestamp'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID, SCHEMA_LATEST } from '../constants'
import { clientId, tsidShared } from '../data-providers/yjs'
import storageModel from '../stores/storageModel'
import hashThought from '../util/hashThought'
import never from '../util/never'
import parseJsonSafe from '../util/parseJsonSafe'
import timestamp from '../util/timestamp'
import storage from './storage'

/** Generates an initial ThoughtIndices with the root, em, and absolute contexts. Note that clientId will be undefined until clientIdReady resolves and initThoughts is dispatched. */
const initialThoughts = (created: Timestamp = timestamp()): ThoughtIndices => {
  const HOME_TOKEN_HASH = HOME_TOKEN
  const ABSOLUTE_TOKEN_HASH = ABSOLUTE_TOKEN
  const EM_TOKEN_HASH = EM_TOKEN
  const thoughtIndex: Index<Thought> = {
    [HOME_TOKEN_HASH]: {
      id: HOME_TOKEN,
      value: HOME_TOKEN,
      parentId: ROOT_PARENT_ID,
      childrenMap: {},
      created: created,
      // start pending to trigger pull
      pending: true,
      lastUpdated: never(),
      rank: 0,
      updatedBy: clientId,
    },
    [ABSOLUTE_TOKEN_HASH]: {
      id: ABSOLUTE_TOKEN,
      value: ABSOLUTE_TOKEN,
      parentId: ROOT_PARENT_ID,
      childrenMap: {},
      created: created,
      // start pending to trigger pull
      pending: true,
      lastUpdated: never(),
      rank: 0,
      updatedBy: clientId,
    },
    [EM_TOKEN_HASH]: {
      id: EM_TOKEN,
      value: EM_TOKEN,
      parentId: ROOT_PARENT_ID,
      childrenMap: {},
      created: created,
      // start pending to trigger pull
      pending: true,
      lastUpdated: never(),
      rank: 0,
      updatedBy: clientId,
    },
  }

  const lexemeIndex: Index<Lexeme> = {
    [hashThought(HOME_TOKEN)]: {
      contexts: [],
      // set to beginning of epoch to ensure that server lexemeIndex is always considered newer from init lexemeIndex
      created,
      lastUpdated: never(),
      updatedBy: clientId,
    },
    [hashThought(ABSOLUTE_TOKEN)]: {
      contexts: [],
      // set to beginning of epoch to ensure that server lexemeIndex is always considered newer from init lexemeIndex
      created,
      lastUpdated: never(),
      updatedBy: clientId,
    },
    // this will get populated by importText in initThoughts
    // unfortunately that's the best way currently to create nested thoughts and ensure that lexemeIndex and thoughtIndex are correct
    [hashThought(EM_TOKEN)]: {
      contexts: [],
      created,
      lastUpdated: never(),
      updatedBy: clientId,
    },
  }

  return {
    thoughtIndex,
    lexemeIndex,
  }
}

/** Generates the initial state of the application. */
const initialState = (created: Timestamp = timestamp()) => {
  const state: State = {
    authenticated: false,
    autologin: storage.getItem('autologin') === 'true',
    contextViews: {},
    cursor: null,
    cursorBeforeSearch: null,
    cursorBeforeQuickAdd: null,
    cursorCleared: false,
    cursorHistory: [],
    cursorInitialized: false,
    cursorOffset: 0,
    dragInProgress: false,
    editableNonce: 0,
    editing: null,
    enableLatestShortcutsDiagram: false,
    error: null,
    expanded: {},
    fontSize: storageModel.get('fontSize'),
    expandHoverDownPaths: {},
    invalidState: false,
    isLoading: true,
    jumpHistory: storageModel.get('jumpHistory'),
    jumpIndex: 0,
    latestShortcuts: [],
    manualSortMap: {},
    modals: {},
    noteFocus: false,
    recentlyEdited: {},
    redoPatches: [],
    resourceCache: {},
    rootContext: [HOME_TOKEN],
    schemaVersion: SCHEMA_LATEST,
    search: null,
    showCommandPalette: false,
    remoteSearch: false,
    searchContexts: null,
    showHiddenThoughts: false,
    showModal: import.meta.env.VITE_DEMO || (!storage.getItem('welcomeComplete') && !tsidShared) ? 'welcome' : null,
    showSidebar: false,
    showSplitView: !!storage.getItem('showSplitView'),
    splitPosition: parseJsonSafe(storage.getItem('splitPosition') || null, 50),
    status: 'disconnected',
    pushQueue: [],
    thoughts: initialThoughts(created),
    undoPatches: [],
  }

  /**
   * Show the modal specified by modal-to-show.
   * Modal-to-show is set to 'welcome' on login, 'auth' on logout, and empty string in offline mode.
   * Modal-to-show is needed because otherwise when the user is autologged in with google, it shows the signup screen for a few seconds then flips to welcome.
   * Use localStorage to get the value of modal-to-show to avoid the flip second auth screen.
   * If modal-to-show is unset, default to the signup screen, unless on localhost.
   * If working offline, modal-to-show is set to an empty string so the welcome dialog is skipped.
   */
  // if (!isLocalNetwork) {
  //   const showModalLocal: Modal | null = (storage.getItem('modal-to-show') as Modal) || null
  //   // do not show the modal if it has been permanently dismissed (complete)
  //   if (showModalLocal && !state.modals[showModalLocal as keyof typeof state.modals]?.complete) {
  //     state.showModal = showModalLocal || 'auth'
  //   }
  // }

  // show the signup modal if the app is loaded with signup path
  if (typeof window !== 'undefined' && window.location.pathname.substr(1) === 'signup') {
    state.showModal = 'signup'
  }

  return state
}

export default initialState
