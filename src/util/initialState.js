import globals from '../globals.js'
import {
  EM_TOKEN,
  RANKED_ROOT,
  ROOT_TOKEN,
  SCHEMA_LATEST,
} from '../constants.js'

// util
import {
  canShowModal,
  hashContext,
  hashThought,
  parseJsonSafe,
} from '../util.js'

export const initialState = () => {

  const state = {

    authenticated: false,
    isLoading: true,
    /* status:
      'disconnected'   Logged out or yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'loading'        Connected, authenticated, and waiting for first user data payload.
      'loaded'         User data payload received (may or may not be offline).
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    focus: RANKED_ROOT,
    contextViews: {},
    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        contexts: [],
        // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
        created: (new Date(0)).toISOString(),
        lastUpdated: (new Date(0)).toISOString(),
      },
      // this will get populated by importText in loadLocalState
      // unfortunately that's the best way currently to create nested thoughts and ensure that thoughtIndex and contextIndex are correct
      [hashThought(EM_TOKEN)]: {
        value: EM_TOKEN,
        contexts: []
      },
    },
    recentlyEdited: {},
    // store children indexed by the encoded context for O(1) lookup of children
    contextIndex: {
      [hashContext([ROOT_TOKEN])]: {
        thoughts: []
      },
    },
    expanded: {},

    // toolbar
    toolbarOverlay: null,
    scrollPrioritized: false,

    // cheap trick to re-render when thoughtIndex has been updated
    dataNonce: 0,
    modals: {},
    cursor: null,
    cursorBeforeEdit: null,
    cursorHistory: [],
    cursorOffset: 0,
    schemaVersion: SCHEMA_LATEST,
    showHiddenThoughts: false,
    showSidebar: false,
    splitPosition: parseJsonSafe(localStorage.getItem('splitPosition'), 0),
    showSplitView: false,
    alert: null,
    invalidState: false,
    editingValue: null
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
  if (canShowModal('welcome', state)) {
    state.showModal = 'welcome'
  }

  return state
}
