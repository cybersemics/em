import globals from '../globals.js'
import {
  RANKED_ROOT,
  ROOT_TOKEN,
  SCHEMA_LATEST,
  TUTORIAL_STEP_NONE,
  TUTORIAL_STEP_START,
} from '../constants.js'

// util
import { encodeItems } from './encodeItems.js'
import { canShowHelper } from './canShowHelper.js'
import { hashThought } from './hashThought.js'

export const initialState = () => {

  const state = {

    authenticated: false,
    isLoading: true,
    /* status:
      'disconnected'   Yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'loading'        Connected, authenticated, and waiting for user thoughtIndex.
      'loaded'         User thoughtIndex received.
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    focus: RANKED_ROOT,
    contextViews: {},
    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        memberOf: [],
        // set to beginning of epoch to ensure that server thoughtIndex is always considered newer from init thoughtIndex
        created: (new Date(0)).toISOString(),
        lastUpdated: (new Date(0)).toISOString(),
      }
    },
    contextBindings: {},
    // store children indexed by the encoded context for O(1) lookup of children
    contextIndex: {
      [encodeItems([ROOT_TOKEN])]: []
    },
    expanded: {},
    settings: {
      dark: true,
      autologin: false,
      tutorialChoice: +(localStorage['settings-tutorialChoice'] || 0),
      tutorialStep: globals.disableTutorial ? TUTORIAL_STEP_NONE : JSON.parse(localStorage['settings-tutorialStep'] || TUTORIAL_STEP_START),
    },
    // cheap trick to re-render when thoughtIndex has been updated
    dataNonce: 0,
    helpers: {},
    cursorHistory: [],
    schemaVersion: SCHEMA_LATEST
  }

  // initial helper states
  const helpers = ['welcome', 'help', 'home', 'newItem', 'newChild', 'newChildSuccess', 'autofocus', 'superscriptSuggestor', 'superscript', 'contextView', 'editIdentum', 'depthBar', 'feedback']
  helpers.forEach(value => {
    state.helpers[value] = {
      complete: globals.disableTutorial || JSON.parse(localStorage['helper-complete-' + value] || 'false'),
      hideuntil: JSON.parse(localStorage['helper-hideuntil-' + value] || '0')
    }
  })

  // welcome helper
  if (canShowHelper('welcome', state)) {
    state.showHelper = 'welcome'
  }

  return state
}
