import globals from '../globals'
import {
  EM_TOKEN,
  RANKED_ROOT,
  ROOT_TOKEN,
  SCHEMA_LATEST,
} from '../constants'

// util
import {
  hashContext,
  hashThought,
  isDocumentEditable,
  parseJsonSafe,
} from '../util'

// selectors
import canShowModal from '../selectors/canShowModal'

export const initialState = () => {

  const state = {
    alert: null,
    authenticated: false,
    autologin: localStorage.autologin === 'true',

    // store children indexed by the encoded context for O(1) lookup of children
    contextIndex: {
      [hashContext([ROOT_TOKEN])]: [],
    },

    contextViews: {},
    cursor: null,
    cursorBeforeEdit: null,
    cursorHistory: [],
    cursorOffset: 0,
    dataNonce: 0, // cheap trick to re-render when thoughtIndex has been updated
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

    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        contexts: [],
        // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
        created: new Date(0).toISOString(),
        lastUpdated: new Date(0).toISOString(),
      },
      // this will get populated by importText in loadLocalState
      // unfortunately that's the best way currently to create nested thoughts and ensure that thoughtIndex and contextIndex are correct
      [hashThought(EM_TOKEN)]: {
        value: EM_TOKEN,
        contexts: []
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
