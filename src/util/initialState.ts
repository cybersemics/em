import { EM_TOKEN, RANKED_ROOT, ROOT_TOKEN, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
import { Lexeme, ParentEntry, Path } from '../types'
import { GenericObject, Nullable } from '../utilTypes'
import { canShowModal } from '../selectors'
import { hashContext, hashThought, isDocumentEditable, never, parseJsonSafe, timestamp } from '../util'

interface ModalProperties {
  complete: boolean,
  hideuntil: number,
}

export interface ThoughtsInterface {
  thoughtIndex: GenericObject<Lexeme>,
  contextIndex?: GenericObject<ParentEntry>,
}

/** Defines a single batch of updates added to the sync queue. */
export interface SyncBatch {
  thoughtIndexUpdates: GenericObject<Lexeme>,
  contextIndexUpdates: GenericObject<ParentEntry>,
  local?: boolean,
  remote?: boolean,
  recentlyEdited: any,
  updates: GenericObject<any>,
}

export interface State {
  alert: any,
  authenticated: boolean,
  autologin: boolean,
  thoughts: ThoughtsInterface,
  modals: GenericObject<ModalProperties>,
  contextViews: GenericObject<boolean>,
  cursor: Nullable<Path>,
  cursorBeforeEdit: Nullable<Path>,
  cursorBeforeSearch: Nullable<Path>,
  cursorHistory: any[],
  cursorOffset: number,
  dataNonce: number,
  dragInProgress: boolean,
  editing: Nullable<boolean>,
  editingValue: Nullable<string>,
  expanded: GenericObject<Path>,
  focus: Path,
  invalidState: boolean,
  isLoading: boolean,
  noteFocus: boolean,
  recentlyEdited: any,
  resourceCache: any,
  schemaVersion: any,
  scrollPrioritized: boolean,
  showHiddenThoughts: boolean,
  showModal: any,
  showSidebar: boolean,
  showSplitView: boolean,
  splitPosition: any,
  status: any,
  syncQueue: SyncBatch[],
  toolbarOverlay: any,
  user: any,
  userRef: any,
}

export type PartialStateWithThoughts =
  Partial<State> & Pick<State, 'thoughts'>

/** Generates an initial ThoughtsInterface with the root and em contexts. */
export const initialThoughts = () => ({
  // store children indexed by the encoded context for O(1) lookup of children
  contextIndex: {
    [hashContext([ROOT_TOKEN])]: {
      children: [],
      // start pending to trigger thoughtCacheMiddleware fetch
      pending: true,
      lastUpdated: never()
    },
  },
  thoughtIndex: {
    [hashThought(ROOT_TOKEN)]: {
      value: ROOT_TOKEN,
      rank: 0,
      contexts: [],
      // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
      created: timestamp(),
      lastUpdated: never()
    },
    // this will get populated by importText in loadLocalState
    // unfortunately that's the best way currently to create nested thoughts and ensure that thoughtIndex and contextIndex are correct
    [hashThought(EM_TOKEN)]: {
      value: EM_TOKEN,
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: never()
    },
  },
})

/** Generates the initial state of the application. */
export const initialState = () => {

  const state: State = {
    alert: null,
    authenticated: false,
    autologin: localStorage.autologin === 'true',
    contextViews: {},
    cursor: null,
    cursorBeforeEdit: null,
    cursorBeforeSearch: null,
    cursorHistory: [],
    cursorOffset: 0,
    dataNonce: 0, // cheap trick to re-render when thoughtIndex has been updated
    dragInProgress: false,
    editing: null,
    editingValue: null,
    expanded: {},
    focus: RANKED_ROOT,
    invalidState: false,
    isLoading: true,
    modals: {},
    noteFocus: false, // true if a note has the browser selection
    recentlyEdited: {},
    resourceCache: {},
    schemaVersion: SCHEMA_LATEST,
    scrollPrioritized: false,
    showHiddenThoughts: false,
    showModal: null,
    showSidebar: false,
    showSplitView: false,
    splitPosition: parseJsonSafe(localStorage.getItem('splitPosition'), 0),
    /* status:
      'disconnected'   Logged out or yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'loading'        Connected, authenticated, and waiting for first user data payload.
      'loaded'         User data payload received (may or may not be offline).
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    syncQueue: [],
    thoughts: initialThoughts(),
    toolbarOverlay: null,
    user: null,
    userRef: null,
  }

  // initial modal states
  const modals = ['welcome', 'help', 'home', 'export']
  modals.forEach(value => {
    state.modals[value] = {
      complete: globals.disableTutorial || JSON.parse(localStorage['modal-complete-' + value] || 'false'),
      hideuntil: JSON.parse(localStorage['modal-hideuntil-' + value] || '0')
    }
  })

  // welcome modal
  if (isDocumentEditable() && canShowModal(state, 'welcome')) {
    state.showModal = 'welcome'
  }

  return state
}
