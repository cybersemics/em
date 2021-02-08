import { EM_TOKEN, MODALS, ROOT_TOKEN, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
import { Alert, Child, Context, Index, Lexeme, Parent, Patch, Path, SimplePath, Timestamp, ThoughtsInterface, User } from '../types'
import { ExistingThoughtChangePayload } from '../reducers/existingThoughtChange'

// import util/selector functions directly since importing from ../util/index causes circular dependency
import { hashContext } from '../util/hashContext'
import { hashThought } from '../util/hashThought'
import { isDocumentEditable } from '../util/isDocumentEditable'
import { never } from '../util/never'
import { parseJsonSafe } from '../util/parseJsonSafe'
import { timestamp } from '../util/timestamp'
import canShowModal from '../selectors/canShowModal'

interface ModalProperties {
  complete: boolean,
  hideuntil: number,
}

// Do not define RecentlyEditedTree type until recentlyEditedTree.ts is typed
// interface RecentlyEditedLeaf {
//   leaf: true,
//   lastUpdated: Timestamp,
//   path: Path,
// }
// type RecentlyEditedTree = Index<RecentlyEditedTree> causes circular reference error
// eslint-disable-next-line @typescript-eslint/no-empty-interface
// export interface RecentlyEditedTree extends Index<RecentlyEditedTree> {}
type RecentlyEditedTree = Index

/** Defines a single batch of updates added to the push queue. */
export interface PushBatch {
  thoughtIndexUpdates: Index<Lexeme | null>,
  contextIndexUpdates: Index<Parent | null>,
  local?: boolean,
  remote?: boolean,
  recentlyEdited: RecentlyEditedTree,
  pendingDeletes?: { context: Context, child: Child }[],
  pendingEdits?: ExistingThoughtChangePayload[],
  pendingMoves?: { pathOld: Path, pathNew: Path }[],
  updates?: Index<string>,
}

export interface State {
  alert?: Alert,
  archived?: boolean,
  authenticated: boolean,
  autologin: boolean,
  contextViews: Index<boolean>,
  cursor: Path | null,
  cursorBeforeSearch: Path | null,
  cursorHistory: Path[],
  cursorInitialized: boolean,
  cursorOffset: number | null,
  dataNonce: number,
  draggedSimplePath?: SimplePath,
  draggingThought?: SimplePath,
  dragHold?: boolean,
  dragInProgress: boolean,
  editableNonce: number,
  editing: (boolean | null),
  editingValue: (string | null),
  error?: string | null,
  expanded: Index<Path>,
  expandedContextThought?: Path,
  hoveringThought?: Context,
  invalidState: boolean,
  inversePatches: Patch[],
  isLoading: boolean,
  isPushing?: boolean,
  lastUpdated?: string,
  modals: Index<ModalProperties>,
  noteFocus: boolean,
  patches: Patch[],
  pushQueue: PushBatch[],
  recentlyEdited: RecentlyEditedTree,
  resourceCache: Index<string>,
  schemaVersion: number,
  scrollPrioritized: boolean,
  search: (string | null),
  searchLimit?: number,
  showHiddenThoughts: boolean,
  showModal?: string | null,
  showQueue?: boolean | null,
  showSidebar: boolean,
  showSplitView: boolean,
  showTopControls: boolean,
  showBreadcrumbs: boolean,
  splitPosition: number,
  status: string,
  thoughts: ThoughtsInterface,
  toolbarOverlay?: string | null,
  tutorialStep?: number,
  user?: User,
}

/** Generates an initial ThoughtsInterface with the root and em contexts. */
export const initialThoughts = (created: Timestamp = timestamp()): ThoughtsInterface => {

  const contextIndex = {
    [hashContext([ROOT_TOKEN])]: {
      // Note: Context hash is being used as id. Data provider tests are breaking because root and em context lack id. So adding it here
      id: hashContext([ROOT_TOKEN]),
      context: [ROOT_TOKEN],
      children: [],
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never()
    },
    [hashContext([EM_TOKEN])]: {
      id: hashContext([EM_TOKEN]),
      context: [EM_TOKEN],
      children: [],
      // start pending to trigger pullQueue fetch
      pending: true,
      lastUpdated: never()
    },
  }

  const thoughtIndex = {
    [hashThought(ROOT_TOKEN)]: {
      value: ROOT_TOKEN,
      contexts: [],
      // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
      created,
      lastUpdated: never()
    },
    // this will get populated by importText in loadLocalState
    // unfortunately that's the best way currently to create nested thoughts and ensure that thoughtIndex and contextIndex are correct
    [hashThought(EM_TOKEN)]: {
      value: EM_TOKEN,
      contexts: [],
      created,
      lastUpdated: never()
    },
  }

  return {
    contextCache: [],
    contextIndex,
    thoughtCache: [],
    thoughtIndex,
  }
}

/** Generates the initial state of the application. */
export const initialState = (created: Timestamp = timestamp()) => {

  const state: State = {
    authenticated: false,
    // eslint-disable-next-line no-mixed-operators
    autologin: typeof localStorage !== 'undefined' && localStorage.autologin === 'true',
    contextViews: {},
    cursor: null,
    cursorBeforeSearch: null,
    cursorHistory: [],
    cursorInitialized: false, // tracks if the cursor has been restored from the url on first load and ensures it only happens once
    cursorOffset: 0,
    dataNonce: 0, // cheap trick to re-render when thoughtIndex has been updated
    dragInProgress: false,
    editableNonce: 0,
    editing: null,
    editingValue: null,
    expanded: {},
    invalidState: false,
    inversePatches: [],
    isLoading: true,
    isPushing: false,
    modals: {},
    noteFocus: false, // true if a note has the browser selection
    patches: [],
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
    // eslint-disable-next-line no-mixed-operators
    splitPosition: parseJsonSafe(typeof localStorage !== 'undefined' ? localStorage.getItem('splitPosition') : null, 0),
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
      complete: globals.disableTutorial || JSON.parse(typeof localStorage !== 'undefined' && localStorage['modal-complete-' + MODALS[key]] || 'false'),
      // eslint-disable-next-line no-mixed-operators
      hideuntil: JSON.parse(typeof localStorage !== 'undefined' && localStorage['modal-hideuntil-' + MODALS[key]] || '0')
    }
  })

  // welcome modal
  if (isDocumentEditable() && canShowModal(state, 'welcome')) {
    state.showModal = 'welcome'
  }

  return state
}
