import { EM_TOKEN, MODALS, ROOT_TOKEN, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
import { canShowModal } from '../selectors'
import { Alert, Context, Index, Lexeme, Parent, Patch, Path, Ref, SimplePath, User } from '../types'

// import util functions directly since importing from ../util/index causes circular dependency
import { hashContext } from '../util/hashContext'
import { hashThought } from '../util/hashThought'
import { isDocumentEditable } from '../util/isDocumentEditable'
import { parseJsonSafe } from '../util/parseJsonSafe'
import { timestamp } from '../util/timestamp'

interface ModalProperties {
  complete: boolean,
  hideuntil: number,
}

export interface ThoughtsInterface {
  thoughtIndex: Index<Lexeme>,
  contextIndex?: Index<Parent>,
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

export interface State {
  alert?: Alert,
  archived?: boolean,
  authenticated: boolean,
  autologin: boolean,
  codeView?: Path | null,
  contextViews: Index<boolean>,
  cursor: Path | null,
  cursorBeforeEdit: Path | null,
  cursorBeforeSearch: Path | null,
  cursorHistory: Path[],
  cursorOffset: number,
  dataNonce: number,
  draggedSimplePath?: SimplePath,
  draggingThought?: SimplePath,
  dragHold?: boolean,
  dragInProgress: boolean,
  editableNonce: number,
  editing: (boolean | null),
  editingValue: (string | null),
  error?: string | null,
  expanded: Index<boolean>,
  expandedContextThought?: Path,
  hoveringThought?: Context,
  invalidState: boolean,
  isLoading: boolean,
  modals: Index<ModalProperties>,
  noteFocus: boolean,
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
  syncQueue?: {
    contextIndexUpdates?: Index<Parent | null>,
    thoughtIndexUpdates?: Index<Lexeme | null>,
    recentlyEdited?: RecentlyEditedTree,
    updates?: Index<string>,
    local?: boolean,
    remote?: boolean,
  },
  thoughts: ThoughtsInterface,
  toolbarOverlay: string | null,
  tutorialStep?: number,
  user?: User,
  userRef?: Ref,
  patches: Patch[],
  inversePatches: Patch[],
}

/** Generates the initial state of the application. */
export const initialState = () => {

  const state: State = {
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
    editableNonce: 0,
    editing: null,
    editingValue: null,
    expanded: {},
    invalidState: false,
    isLoading: true,
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
    thoughts: {
      // store children indexed by the encoded context for O(1) lookup of children
      contextIndex: {
        [hashContext([ROOT_TOKEN])]: {
          context: [ROOT_TOKEN],
          children: [],
          lastUpdated: timestamp()
        },
      },
      thoughtIndex: {
        [hashThought(ROOT_TOKEN)]: {
          value: ROOT_TOKEN,
          rank: 0,
          contexts: [],
          // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
          created: timestamp(),
          lastUpdated: timestamp(),
        },
        // this will get populated by importText in loadLocalState
        // unfortunately that's the best way currently to create nested thoughts and ensure that thoughtIndex and contextIndex are correct
        [hashThought(EM_TOKEN)]: {
          value: EM_TOKEN,
          rank: 0,
          contexts: [],
          created: timestamp(),
          lastUpdated: timestamp()
        },
      },
    },
    toolbarOverlay: null,
    patches: [],
    inversePatches: []
  }
  Object.keys(MODALS).forEach(key => {
    // initial modal states
    state.modals[MODALS[key]] = {
      complete: globals.disableTutorial || JSON.parse(localStorage['modal-complete-' + MODALS[key]] || 'false'),
      hideuntil: JSON.parse(localStorage['modal-hideuntil-' + MODALS[key]] || '0')
    }
  })

  // welcome modal
  if (isDocumentEditable() && canShowModal(state, 'welcome')) {
    state.showModal = 'welcome'
  }

  return state
}
