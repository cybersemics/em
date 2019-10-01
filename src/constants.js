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
// export const HELPER_NEWCHILD_DELAY = 1800
// export const HELPER_SUPERSCRIPT_SUGGESTOR_DELAY = 1000 * 30
// export const HELPER_SUPERSCRIPT_DELAY = 800
// per-character frequency of text animation (ms)
export const ANIMATE_CHAR_STEP = 36
export const ANIMATE_PAUSE_BETWEEN_ITEMS = 500

// each tutorial step is defined as a constant for compile-time validation
// enumerated values must be sequential from 0..n
export const TUTORIAL_STEP_START = 0
export const TUTORIAL_STEP_FIRSTTHOUGHT = 1
export const TUTORIAL_STEP_ENTERTHOUGHT = 2
export const TUTORIAL_STEP_NEWTHOUGHTINCONTEXT = 3
export const TUTORIAL_STEP_END = 4

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
