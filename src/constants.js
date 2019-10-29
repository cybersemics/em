/** Defines app-wide constants */

// maximum number of characters of children to allow expansion
export const MAX_DISTANCE_FROM_CURSOR = 3
export const MAX_DEPTH = 20
export const FADEOUT_DURATION = 400
// ms on startup before offline mode is enabled
// sufficient to avoid flash on login
export const OFFLINE_TIMEOUT = 8000
export const RENDER_DELAY = 50
export const MAX_CURSOR_HISTORY = 50
export const HELPER_REMIND_ME_LATER_DURATION = 1000 * 60 * 60 * 2 // 2 hours
// export const HELPER_REMIND_ME_TOMORROW_DURATION = 1000 * 60 * 60 * 20 // 20 hours
export const HELPER_CLOSE_DURATION = 1000//1000 * 60 * 5 // 5 minutes
export const HELPER_NEWCHILD_DELAY = 1200
// export const HELPER_SUPERSCRIPT_SUGGESTOR_DELAY = 1000 * 30
// export const HELPER_SUPERSCRIPT_DELAY = 800
// per-character frequency of text animation (ms)
export const ANIMATE_CHAR_STEP = 36
export const ANIMATE_PAUSE_BETWEEN_ITEMS = 500

// each tutorial step is defined as a constant for compile-time validation
// all integers must existing between TUTORIAL_STEP_START and TUTORIAL_STEP_END
// fractional values may be used for "hints" that are not included in the Next/Prev sequence

export const TUTORIAL_STEP_NONE = 0

// Basics tutorial
export const TUTORIAL_STEP_START = 1
export const TUTORIAL_STEP_FIRSTTHOUGHT = 2
export const TUTORIAL_STEP_FIRSTTHOUGHT_ENTER = 3
export const TUTORIAL_STEP_FIRSTTHOUGHT_ENTER_HINT = 3.1
export const TUTORIAL_STEP_SECONDTHOUGHT = 4
export const TUTORIAL_STEP_SECONDTHOUGHT_HINT = 4.1
export const TUTORIAL_STEP_SECONDTHOUGHT_ENTER = 5
export const TUTORIAL_STEP_SECONDTHOUGHT_ENTER_HINT = 5.1
export const TUTORIAL_STEP_SUBTHOUGHT = 6
export const TUTORIAL_STEP_SUBTHOUGHT_ENTER = 7
export const TUTORIAL_STEP_AUTOEXPAND = 8
export const TUTORIAL_STEP_AUTOEXPAND_EXPAND = 9
export const TUTORIAL_STEP_SUCCESS = 10

// Linked Thoughts tutorial
export const TUTORIAL2_STEP_START = 11
export const TUTORIAL2_STEP_CREATE = 12
export const TUTORIAL2_STEP_CREATE_HINT = 12.1
export const TUTORIAL2_STEP_SUBTHOUGHT = 13
export const TUTORIAL2_STEP_SUBTHOUGHT_HINT = 13.1
export const TUTORIAL2_STEP_SUBTHOUGHT_HINT_ENTER = 13.2
// export const TUTORIAL2_STEP_SUBTHOUGHT_IN_ROOT
export const TUTORIAL2_STEP_DUPLICATE_THOUGHT = 14
// export const TUTORIAL2_STEP_SAME_CONTEXT
export const TUTORIAL2_STEP_MULTIPLE_CONTEXTS = 15
export const TUTORIAL2_STEP_CONTEXT_VIEW_SELECT = 16
export const TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE = 17
export const TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE_HINT = 17.1
export const TUTORIAL2_STEP_CONTEXT_VIEW_OPEN = 18
export const TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES = 19
export const TUTORIAL2_STEP_SUCCESS = 20

export const TUTORIAL_SAMPLE_CONTEXT = 'To Do'


// constants for different data schema versions
export const SCHEMA_CONTEXTCHILDREN = 1
export const SCHEMA_ROOT = 2 // change root → __ROOT__
// export const SCHEMA_HASHKEYS = 3 // murmurhash data keys to avoid key path too long firebase error
export const SCHEMA_LATEST = SCHEMA_ROOT

// store the empty string as a non-empty token in firebase since firebase does not allow empty child records
// See: https://stackoverflow.com/questions/15911165/create-an-empty-child-record-in-firebase
export const EMPTY_TOKEN = '__EMPTY__'

// store the root string as a token that is not likely to be written by the user (bad things will happen)
export const ROOT_TOKEN = '__ROOT__'

export const RANKED_ROOT = [{ key: ROOT_TOKEN, rank: 0 }]

// allow the results of the new getChildrenWithRank which uses contextChildren to be compared against getChildrenWithRankDEPRECATED which uses inefficient memberOf collation to test for functional parity at the given probability between 0 (no testing) and 1 (test every call to getChildrenWithRank
export const GETCHILDRENWITHRANK_VALIDATION_FREQUENCY = 0

export const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB7sj38woH-oJ7hcSwpq0lB7hUteyZMxNo',
  authDomain: 'em-proto.firebaseapp.com',
  databaseURL: 'https://em-proto.firebaseio.com',
  projectId: 'em-proto',
  storageBucket: 'em-proto.appspot.com',
  messagingSenderId: '91947960488'
}
