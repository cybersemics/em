/** Defines app-wide constants */

// maximum number of characters of children to allow expansion
export const MAX_DISTANCE_FROM_CURSOR = 3
export const MAX_DEPTH = 20
export const FADEOUT_DURATION = 400
// ms on startup before offline mode is enabled
// sufficient to avoid flash on login
export const OFFLINE_TIMEOUT = 8 * 1000
export const ERROR_TIMEOUT = 30 * 1000
export const RENDER_DELAY = 50
export const MAX_CURSOR_HISTORY = 50
export const MODAL_REMIND_ME_LATER_DURATION = 1000 * 60 * 60 * 2 // 2 hours
// export const MODAL_REMIND_ME_TOMORROW_DURATION = 1000 * 60 * 60 * 20 // 20 hours
export const MODAL_CLOSE_DURATION = 1000 // 1000 * 60 * 5 // 5 minutes
export const MODAL_NEWCHILD_DELAY = 1200
// export const MODAL_SUPERSCRIPT_SUGGESTOR_DELAY = 1000 * 30
// export const MODAL_SUPERSCRIPT_DELAY = 800

// each tutorial step is defined as a constant for compile-time validation
// all integers must existing between TUTORIAL_STEP_START and TUTORIAL_STEP_END
// fractional values may be used for "hints" that are not included in the Next/Prev sequence

// Basics tutorial
export const TUTORIAL_STEP_START = 1
export const TUTORIAL_STEP_FIRSTTHOUGHT = 2
export const TUTORIAL_STEP_FIRSTTHOUGHT_ENTER = 3
export const TUTORIAL_STEP_SECONDTHOUGHT = 4
export const TUTORIAL_STEP_SECONDTHOUGHT_HINT = 4.1
export const TUTORIAL_STEP_SECONDTHOUGHT_ENTER = 5
export const TUTORIAL_STEP_SUBTHOUGHT = 6
export const TUTORIAL_STEP_SUBTHOUGHT_ENTER = 7
export const TUTORIAL_STEP_AUTOEXPAND = 8
export const TUTORIAL_STEP_AUTOEXPAND_EXPAND = 9
export const TUTORIAL_STEP_SUCCESS = 10

// Linked Thoughts tutorial
export const TUTORIAL2_STEP_START = 11
export const TUTORIAL2_STEP_CHOOSE = 12
export const TUTORIAL2_STEP_CONTEXT1_PARENT = 13
export const TUTORIAL2_STEP_CONTEXT1_PARENT_HINT = 13.1
export const TUTORIAL2_STEP_CONTEXT1 = 14
export const TUTORIAL2_STEP_CONTEXT1_HINT = 14.1
export const TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT = 15
export const TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT = 15.1
export const TUTORIAL2_STEP_CONTEXT2_PARENT = 16
export const TUTORIAL2_STEP_CONTEXT2_PARENT_HINT = 16.1
export const TUTORIAL2_STEP_CONTEXT2 = 17
export const TUTORIAL2_STEP_CONTEXT2_HINT = 17.1
export const TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT = 18
export const TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT = 18.1
export const TUTORIAL2_STEP_CONTEXT_VIEW_SELECT = 19
export const TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE = 20
export const TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE_HINT = 20.1
export const TUTORIAL2_STEP_CONTEXT_VIEW_OPEN = 21
export const TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES = 22
export const TUTORIAL2_STEP_SUCCESS = 23

export const TUTORIAL_VERSION_TODO = 0
export const TUTORIAL_VERSION_JOURNAL = 1
export const TUTORIAL_VERSION_BOOK = 2

export const TUTORIAL_CONTEXT = {
  [TUTORIAL_VERSION_TODO]: 'To Do',
  [TUTORIAL_VERSION_JOURNAL]: 'Relationships',
  [TUTORIAL_VERSION_BOOK]: 'Psychology',
}

export const TUTORIAL_CONTEXT1_PARENT = {
  [TUTORIAL_VERSION_TODO]: 'Home',
  [TUTORIAL_VERSION_JOURNAL]: 'Journal',
  [TUTORIAL_VERSION_BOOK]: 'Podcasts',
}

export const TUTORIAL_CONTEXT2_PARENT = {
  [TUTORIAL_VERSION_TODO]: 'Work',
  [TUTORIAL_VERSION_JOURNAL]: 'Therapy',
  [TUTORIAL_VERSION_BOOK]: 'Books',
}

// constants for different thoughtIndex schema versions
// export const SCHEMA_INITIAL = 0 // DEPRECATED
// export const SCHEMA_CONTEXTCHILDREN = 1 // DEPRECATED
export const SCHEMA_ROOT = 2 // change root → __ROOT__
export const SCHEMA_HASHKEYS = 3 // hash thoughtIndex keys
export const SCHEMA_META_SETTINGS = 4 // load settings from hidden thoughts via metaprogramming
export const SCHEMA_LATEST = SCHEMA_META_SETTINGS

// store the empty string as a non-empty token in firebase since firebase does not allow empty child records
// See: https://stackoverflow.com/questions/15911165/create-an-empty-child-record-in-firebase
export const EMPTY_TOKEN = '__EMPTY__'

// store the root string as a token that is not likely to be written by the user (bad things will happen)
export const ROOT_TOKEN = '__ROOT__'

// token for hidden system context
export const EM_TOKEN = '__EM__'

export const RANKED_ROOT = [{ value: ROOT_TOKEN, rank: 0 }]

export const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB7sj38woH-oJ7hcSwpq0lB7hUteyZMxNo',
  authDomain: 'em-proto.firebaseapp.com',
  databaseURL: 'https://em-proto.firebaseio.com',
  projectId: 'em-proto',
  storageBucket: 'em-proto.appspot.com',
  messagingSenderId: '91947960488'
}

export const ID = x => x
export const NOOP = () => { }

// prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
export const AUTO_PROSE_VIEW_MIN_CHARS = 200

export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 40
export const FONT_SCALE_INCREMENT = 1
export const FONT_SCALE_DEFAULT = 16

// the maximum number of characters of a thought to display before ellipsizing in links and tutorial
export const THOUGHT_ELLIPSIZED_CHARS = 16

// time before gesture hint appears
export const GESTURE_SEGMENT_HINT_TIMEOUT = 500

// time before shortcut hint overlay appears
export const SHORTCUT_HINT_OVERLAY_TIMEOUT = 500

// time before scroll prioritization is disabled
export const SCROLL_PRIORITIZATION_TIMEOUT = 500

// number of recently edited thoughts to store
export const RECENTLY_EDITED_THOUGHTS_LIMIT = 100

// maximum number of chars to show in url before ellipsizing
export const URL_MAX_CHARS = 40

// to expand thought ends with ':'
export const EXPAND_THOUGHT_CHAR = ':'
export const MAX_EXPAND_DEPTH = 5

// shortcut ids of default buttons that appear in the toolbar
// otherwise read from Settings thought
export const TOOLBAR_DEFAULT_SHORTCUTS = [
  'search',
  'outdent',
  'indent',
  'delete',
  'toggleContextView',
  'toggleTableView',
  'toggleSort',
  'note',
  'proseView',
  'toggleSplitView',
  'subcategorizeOne',
  'subcategorizeAll',
  'toggleHiddenThoughts',
  'undo',
  'redo',
  'exportContext',
]

// throttle time in ms for onChange handler for thought edit
export const EDIT_THROTTLE = process.env.NODE_ENV === 'test' ? 0 : 800

export const INITIAL_SETTINGS = `
  <ul>
    <li>Settings
      <ul>
        <li>=readonly</li>

        <li>Theme
          <ul>
            <li>=readonly</li>
            <li>=options
              <ul>
                <li>Dark</li>
                <li>Light</li>
              </ul>
            </li>
            <li>Dark</li>
          </ul>
        </li>

        <li>Font Size
          <ul>
            <li>=readonly</li>
            <li>=type
              <ul>
                <li>Number</li>
              </ul>
            </li>
            <li>18</li>
          </ul>
        </li>

        <li>Data Integrity Check
          <ul>
            <li>=readonly</li>
            <li>=hidden</li>
            <li>=options
              <ul>
                <li>On</li>
                <li>Off</li>
              </ul>
            </li>
            <li>Off</li>
          </ul>
        </li>

        <li>Autologin
          <ul>
            <li>=readonly</li>
            <li>=hidden</li>
            <li>=options
              <ul>
                <li>On</li>
                <li>Off</li>
              </ul>
            </li>
            <li>Off</li>
          </ul>
        </li>

        <li>Tutorial
          <ul>
            <li>=readonly</li>
            <li>=hidden</li>
            <li>=options
              <ul>
                <li>On</li>
                <li>Off</li>
              </ul>
            </li>
            <li>On</li>
          </ul>
        </li>

        <li>Tutorial Choice
          <ul>
            <li>=readonly</li>
            <li>=hidden</li>
            <li>=type
              <ul>
                <li>Number</li>
              </ul>
            </li>
            <li>0</li>
          </ul>
        </li>

        <li>Tutorial Step
          <ul>
            <li>=readonly</li>
            <li>=hidden</li>
            <li>=type
              <ul>
                <li>Number</li>
              </ul>
            </li>
            <li>1</li>
          </ul>
        </li>

      </ul>
    </li>
  </ul>
`
