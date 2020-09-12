import { EM_TOKEN, RANKED_ROOT, ROOT_TOKEN, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
import { Context, Lexeme, ParentEntry, Path } from '../types'
import { GenericObject, Nullable } from '../utilTypes'
import { canShowModal } from '../selectors'

// import util functions directly since importing from ../util/index causes circular dependency
import { hashContext } from '../util/hashContext'
import { hashThought } from '../util/hashThought'
import { isDocumentEditable } from '../util/isDocumentEditable'
import { never } from '../util/never'
import { parseJsonSafe } from '../util/parseJsonSafe'
import { timestamp } from '../util/timestamp'

interface ModalProperties {
  complete: boolean,
  hideuntil: number,
}

export interface ThoughtsInterface {
  contextIndex: GenericObject<ParentEntry>,
  contextCache: string[],
  thoughtIndex: GenericObject<Lexeme>,
  thoughtCache: string[],
}

/** Defines a single batch of updates added to the sync queue. */
export interface SyncBatch {
  thoughtIndexUpdates: GenericObject<Lexeme | null>,
  contextIndexUpdates: GenericObject<ParentEntry | null>,
  local?: boolean,
  remote?: boolean,
  recentlyEdited: GenericObject<any>,
  updates?: GenericObject<string>,
}

export interface State {
  alert: any,
  archived?: boolean,
  authenticated: boolean,
  autologin: boolean,
  contextViews: GenericObject<boolean>,
  cursor: Nullable<Path>,
  cursorBeforeEdit: Nullable<Path>,
  cursorBeforeSearch: Nullable<Path>,
  cursorHistory: any[],
  cursorOffset: number,
  dataNonce: number,
  draggedThoughtsRanked?: Path,
  draggingThought?: any,
  dragHold?: boolean,
  dragInProgress: boolean,
  editing: Nullable<boolean>,
  editingValue: Nullable<string>,
  error?: any,
  expanded: GenericObject<Path>,
  expandedContextThought?: Path,
  focus: Path,
  hoveringThought?: Context,
  invalidState: boolean,
  isLoading: boolean,
  isSyncing?: boolean,
  lastUpdated?: string,
  modals: GenericObject<ModalProperties>,
  noteFocus: boolean,
  recentlyEdited: GenericObject<any>,
  resourceCache: any,
  schemaVersion: any,
  scrollPrioritized: boolean,
  search: Nullable<string>,
  searchLimit?: number,
  showHiddenThoughts: boolean,
  showModal?: string | null,
  showQueue?: boolean | null,
  showSidebar: boolean,
  showSplitView: boolean,
  showTopControls: boolean,
  showBreadcrumbs: boolean,
  splitPosition: any,
  status: any,
  syncQueue: SyncBatch[],
  thoughts: ThoughtsInterface,
  toolbarOverlay: string | null,
  tutorialStep?: number,
  user?: any,
  userRef?: any,
}

export type PartialStateWithThoughts =
  Partial<State> & Pick<State, 'thoughts'>

/** Generates an initial ThoughtsInterface with the root and em contexts. */
export const initialThoughts = () => {

  const contextIndex = {
    [hashContext([ROOT_TOKEN])]: {
      children: [],
      // start pending to trigger thoughtCacheMiddleware fetch
      pending: true,
      lastUpdated: never()
    },
    [hashContext([EM_TOKEN])]: {
      children: [],
      // start pending to trigger thoughtCacheMiddleware fetch
      pending: true,
      lastUpdated: never()
    },
  }

  const thoughtIndex = {
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
  }

  return {
    contextCache: Object.keys(contextIndex),
    contextIndex,
    thoughtCache: Object.keys(thoughtIndex),
    thoughtIndex,
  }
}

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
    isSyncing: false,
    modals: {},
    noteFocus: false, // true if a note has the browser selection
    recentlyEdited: {},
    resourceCache: {},
    schemaVersion: SCHEMA_LATEST,
    scrollPrioritized: false,
    search: null,
    showHiddenThoughts: false,
    showSidebar: false,
    showSplitView: false,
    showTopControls: true,
    showBreadcrumbs: true,
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
