import { EM_TOKEN, RANKED_ROOT, ROOT_TOKEN, SCHEMA_LATEST } from '../constants'
import globals from '../globals'
import { Context, Lexeme, ParentEntry, Path } from '../types'
import { GenericObject, Nullable } from '../utilTypes'
import { canShowModal } from '../selectors'

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
  thoughtIndex: GenericObject<Lexeme>,
  contextIndex?: GenericObject<ParentEntry>,
}

export interface State {
  alert: any,
  archived?: boolean,
  authenticated: boolean,
  autologin: boolean,
  codeView?: Path | null,
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
  expanded: GenericObject<boolean>,
  expandedContextThought?: Path,
  focus: Path,
  hoveringThought?: Context,
  invalidState: boolean,
  isLoading: boolean,
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
  syncQueue?: {
    contextIndexUpdates?: GenericObject<ParentEntry | null>,
    thoughtIndexUpdates?: GenericObject<Lexeme | null>,
    recentlyEdited?: GenericObject<any>,
    updates?: GenericObject<string>,
    local?: boolean,
    remote?: boolean,
  },
  thoughts: ThoughtsInterface,
  toolbarOverlay: string | null,
  tutorialStep?: number,
  user?: any,
}

export type PartialStateWithThoughts =
  Partial<State> & Pick<State, 'thoughts'>

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
