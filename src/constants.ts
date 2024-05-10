/** Defines app-wide constants. */
import ShortcutId from './@types/ShortcutId'
import SimplePath from './@types/SimplePath'
import ThoughtId from './@types/ThoughtId'
import { emojiRegex } from './emojiRegex'

// maximum number of characters of children to allow expansion
export const MAX_DISTANCE_FROM_CURSOR = 3
export const MAX_DEPTH = 20
export const FADEOUT_DURATION = 400

// number of ms to wait after thought hover to expand it's children
export const EXPAND_HOVER_DELAY = 1000

// ms on startup before offline mode is enabled
// sufficient to avoid flash on login
export const OFFLINE_TIMEOUT = 8 * 1000
export const ERROR_TIMEOUT = 30 * 1000
export const MAX_CURSOR_HISTORY = 50
export const MODAL_REMIND_ME_LATER_DURATION = 1000 * 60 * 60 * 2 // 2 hours
// export const MODAL_REMIND_ME_TOMORROW_DURATION = 1000 * 60 * 60 * 20 // 20 hours
export const MODAL_CLOSE_DURATION = 1000 // 1000 * 60 * 5 // 5 minutes
export const MODAL_NEWCHILD_DELAY = 1200
// export const MODAL_SUPERSCRIPT_SUGGESTOR_DELAY = 1000 * 30
// export const MODAL_SUPERSCRIPT_DELAY = 800

// divider plus px from max width of list items
export const DIVIDER_PLUS_PX = 30
export const DIVIDER_MIN_WIDTH = 85

export const LATEST_SHORTCUT_DIAGRAM_DURATION = 800

// number of latest shorrcuts to show at a time
export const LATEST_SHORTCUT_LIMIT = 3

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

// constants for different schema versions
export const SCHEMA_INITIAL = 0 // DEPRECATED
export const SCHEMA_CONTEXTCHILDREN = 1 // DEPRECATED
export const SCHEMA_ROOT = 2 // change root → __ROOT__
export const SCHEMA_HASHKEYS = 3 // hash lexemeIndex keys
export const SCHEMA_META_SETTINGS = 4 // load settings from hidden thoughts via metaprogramming
export const SCHEMA_UNIQUE_IDS = 5 // add unique ids to thoughts for independent editing (#1495)
export const SCHEMA_CHILDREN_MAP = 6 // convert children array to childrenMap object (#1587)
export const SCHEMA_THOUGHT_WITH_CHILDREN = 7 // store all children in the Thought Object to allow O(1) lookup (#1592)
// 1. lexeme.lemma renamed to Lexeme.lemma
// 2. Lexeme.contexts changed from array to object
// 3. lexemeIndex re-keyed with new hashing function to differentiate =archive and =archive
export const SCHEMA_LEMMA = 8
export const SCHEMA_LATEST = 8

// store the root string as a token that is not likely to be written by the user (bad things will happen)
export const HOME_TOKEN = '__ROOT__' as ThoughtId

export const ROOT_PARENT_ID = '__ROOT_PARENT_ID__' as ThoughtId

// token for hidden system context
export const EM_TOKEN = '__EM__' as ThoughtId

export const ABSOLUTE_TOKEN = '__ABSOLUTE__' as ThoughtId

export const ROOT_CONTEXTS = [HOME_TOKEN, ABSOLUTE_TOKEN]

export const HOME_PATH = [HOME_TOKEN] as SimplePath
export const ABSOLUTE_PATH = [ABSOLUTE_TOKEN] as SimplePath

export const ALLOW_SINGLE_CONTEXT = false

/** A void function that does nothing (noop means "no operation"). */
export const noop = () => {} // eslint-disable-line @typescript-eslint/no-empty-function

// prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
export const AUTO_PROSE_VIEW_MIN_CHARS = 200

// the base font of the browser used to calculate the scaling ratio
export const BASE_FONT_SIZE = 16

export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 40
export const FONT_SCALE_INCREMENT = 1

// to detect if field has multiline
export const MIN_LINE_HEIGHT = 26

// the maximum number of characters of a thought to display before ellipsizing in links and tutorial
export const THOUGHT_ELLIPSIZED_CHARS = 16

// The text that is alerted when a gesture is made that does not correspond to a valid shortcut.
export const GESTURE_CANCEL_ALERT_TEXT = '✗ Cancel gesture'

// delay after gesture hint is activated before command palette appears
export const COMMAND_PALETTE_TIMEOUT = 400

// number of recently edited thoughts to store
export const RECENTLY_EDITED_THOUGHTS_LIMIT = 100

// maximum number of chars to show in url before ellipsizing
export const URL_MAX_CHARS = 40

// to expand thought ends with ':'
export const EXPAND_THOUGHT_CHAR = ':'
export const MAX_EXPAND_DEPTH = 10

// shortcut ids of default buttons that appear in the toolbar
// otherwise read from Settings thought
export const TOOLBAR_DEFAULT_SHORTCUTS: ShortcutId[] = [
  'undo',
  'redo',
  'favorite',
  'outdent',
  'indent',
  'pin',
  'pinChildren',
  'toggleTableView',
  'toggleSort',
  'toggleDone',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'textColor',
  'toggleContextView',
  'note',
  'subcategorizeOne',
  'subcategorizeAll',
  'delete',
  'splitSentences',
  'toggleHiddenThoughts',
  'exportContext',
  'devices',
  'settings',
  // 'archive',
  // 'bindContext',
  // 'bumpThoughtDown',
  // 'clearThought',
  // 'collapseContext',
  // 'copyCursor',
  // 'cursorBack',
  // 'cursorDown',
  // 'cursorForward',
  // 'cursorNext',
  // 'cursorPrev',
  // 'cursorUp',
  // 'deleteEmptyThoughtOrOutdent',
  // 'deleteThoughtWithCursor',
  // 'extractThought',
  // 'help',
  // 'home',
  // 'join',
  // 'moveCursorBackward',
  // 'moveCursorForward',
  // 'moveThoughtDown',
  // 'moveThoughtUp',
  // 'newGrandChild',
  // 'newSubthought',
  // 'newSubthoughtTop',
  // 'newThoughtAbove',
  // 'newThought',
  // 'newUncle',
  // 'proseView',
  // 'search',
  // 'textColor',
  // 'toggleDone',
  // 'toggleSidebar',
  // 'toggleSplitView',
]

// Throttle editThought when user is typing.
// See: thoughtChangeHandler in Editable.tsx.
export const EDIT_THROTTLE = 500

// matches a string with only punctuation
export const REGEX_PUNCTUATIONS = /^\W+$/i

// matches text with HTML
export const REGEX_HTML = /<\/?[a-z][\s\S]*>/i

// matches HTML tags
// can be used to replace all HTML in a string
export const REGEX_TAGS = /(<([^>]+)>)/gi

export const IPFS_GATEWAY = 'ipfs.infura.io'

// delay before long press is activated
// also used for react-dnd's delayTouchStart
export const TIMEOUT_LONG_PRESS_THOUGHT = 300

export const MODIFIER_KEYS = {
  Alt: 1,
  Ctrl: 1,
  Meta: 1,
  Shift: 1,
}

export const BETA_HASH = '8e767ca4e40aff7e22b14e5bf51743d8'

export const EMOJI_REGEX = emojiRegex
/*
  Note: Use string.match instead of regex.test when using a regex with the global modifier. Regex with global modifier keeps the state of its previous match causing unwanted results.
  See: https://stackoverflow.com/a/30887581/10168748
 */
export const REGEX_EMOJI_GLOBAL = new RegExp(EMOJI_REGEX.source, 'g')

export const ALLOWED_FORMATTING_TAGS = ['b', 'i', 'u', 'em', 'strong', 'span', 'strike']

export const ALLOWED_TAGS = ['ul', 'li', 'br', ...ALLOWED_FORMATTING_TAGS]

export const ALLOWED_ATTR = ['class', 'style']

export const EMPTY_SPACE = '  '

export const META_PROGRAMMING_HELP = [
  {
    code: 'bullets',
    description: 'Options: Bullets, None\nHide the bullets of a context. For a less bullety look.',
  },
  {
    code: 'drop',
    description:
      'Options: top, bottom\nControls where in a context an item is placed after drag-and-drop. Default: bottom.',
  },
  {
    code: 'focus',
    description:
      'Options: Normal, Zoom\nWhen the cursor is on this thought, hide its parent and siblings for additional focus. Excellent for study time or when you have had too much coffee.',
  },
  {
    code: 'hidden',
    description: 'Hide the thought.',
  },
  {
    code: 'immovable',
    description: 'The thought cannot be moved. Not very useful.',
  },
  {
    code: 'label',
    description: 'Display a note in smaller text underneath the thought. How pretty.',
  },
  {
    code: 'options',
    description: 'A list of allowed subthoughts. We all have times when we need to be strict.',
  },
  {
    code: 'pin',
    description: 'Keep a thought expanded, forever. Or at least until you unpin it.',
  },
  {
    code: 'publish',
    description: 'Specify meta data for publishing the context as an article.',
    hasChildren: true,
    children: [
      {
        code: 'Byline',
        description: 'A small byline of one or more lines to be displayed under the title.',
      },
      {
        code: 'Email',
        description:
          'A gravatar email to display as a small avatar next to the Byline. Something professional, or perhaps something sexy?',
      },
      {
        code: 'Title',
        description: 'Override the title of the article when exported.',
      },
    ],
  },
  {
    code: 'readonly',
    description: 'The thought cannot be edited, moved, or extended. Excellent for frustrating oneself.',
  },
  {
    code: 'src',
    description: 'Import thoughts from a given URL. Accepts plaintext, markdown, and HTML. Very buggy, trust me.',
  },
  {
    code: 'style',
    description:
      'Set CSS styles on the thought. You can set a style on all children or grandchildren with =children/=style or =grandchildren/=style, respectively.',
  },
  {
    code: 'uneditable',
    description: 'The thought cannot be edited. How depressing.',
  },
  {
    code: 'unextendable',
    description: 'New subthoughts may not be added to the thought.',
  },
  {
    code: 'view',
    description:
      'Options: Article, List, Table, Prose\n Controls how the thought and its subthoughts are displayed. Use "Table" to create two columns, and "Prose" forlongform writing. Default: List.',
  },
]

export const GLOBAL_STYLE_ENV = {
  '=heading1': {
    style: {
      fontSize: '2em',
      fontWeight: 700,
      marginTop: '0.5em',
    },
    bullet: 'None',
  },
  '=heading2': {
    style: {
      fontSize: '1.75em',
      fontWeight: 700,
      marginTop: '0.5em',
    },
    bullet: 'None',
  },
  '=heading3': {
    style: {
      fontSize: '1.5em',
      fontWeight: 700,
      marginTop: '0.5em',
    },
    bullet: 'None',
  },
  '=heading4': {
    style: {
      fontSize: '1.25em',
      fontWeight: 600,
      marginTop: '0.5em',
    },
    bullet: 'None',
  },
  '=heading5': {
    style: {
      fontSize: '1.1em',
      fontWeight: 600,
      marginTop: '0.5em',
    },
    bullet: 'None',
  },
  '=done': {
    style: {
      color: 'gray',
      textDecoration: 'line-through',
    },
    bullet: null,
  },
}

export enum ViewMode {
  Table = 'Table',
  Prose = 'Prose',
}

// Static alert text that is used in multiple places.
// There may also be dynamic alert text, which would defined as selectors, e.g. deleteThoughtAlertText.
export const AlertText = {
  DragAndDrop: 'Drag and drop to move thought',
  DragAndDropFile: 'Drop to import file',
  DragAndDropToolbar: 'Drag and drop to reorder toolbar',
  DragAndDropToolbarAdd: 'Drag and drop to add to toolbar',
  ReorderFavorites: 'Drag and drop to reorder favorites',
}

export enum AlertType {
  // shown when a thought is copied to the clipboard or still loading in the export modal
  Clipboard = 'Clipboard',
  // shown when a dragged thought is hovering over the CopyOneDrop component
  CopyOneDropHint = 'CopyOneDropHint',
  // shown when a dragged thought is hovering over the DeleteDrop component
  DeleteDropHint = 'DeleteDropHint',
  // shown when a thought is deleted
  DeleteThoughtComplete = 'DeleteThoughtComplete',
  // shown when dragging a file
  DragAndDropFile = 'DragAndDropFile',
  // shown when dragging a thought
  DragAndDropHint = 'DragAndDropHint',
  // shown when dragging a toolbar button
  DragAndDropToolbarHint = 'DragAndDropToolbarHint',
  // shown when dragging a toolbar button from the shortcut table
  DragAndDropToolbarAdd = 'DragAndDropToolbarAdd',
  // shown when a dragged thought is hovering over the ExportDrop component
  ExportDropHint = 'ExportDropHint',
  // shown during a MultiGesture
  GestureHint = 'GestureHint',
  // shown when importing one or more files via drag-and-drop or a large paste
  ImportFile = 'ImportFile',
  // shown the first time the user types space to indent
  SpaceToIndentHint = 'SpaceToIndentHint',
  // shown when the sort setting is changed
  Sort = 'Sort',
  // shown when a thought is archived
  ThoughtArchived = 'ThoughtArchived',
  // shown when a thought has been deleted
  ThoughtDeleted = 'ThoughtDeleted',
  // shown when a thought has been moved to a different context
  ThoughtMoved = 'ThoughtMoved',
  // shown when a toolbar button is hovering over the area for removal in the CustomizeToolbar modal
  ToolbarButtonRemoveHint = 'ToolbarButtonRemoveHint',
  // shown when a toolbar button has been removed from the toolbar in the CustomizeToolbar modal
  ToolbarButtonRemoved = 'ToolbarButtonRemoved',
  // shown when the user has exceeded the maximimum number of characters allowed in feedback
  ModalFeedbackMaxChars = 'ModalFeedbackMaxChars',
}

// User settings that can be saved to /EM/Settings/
// See Settings modal for full descriptions.
export enum Settings {
  disableGestureTracing = 'disableGestureTracing',
  experienceMode = 'experienceMode',
  hideScrollZone = 'hideScrollZone',
  leftHanded = 'leftHanded',
  favoritesHideContexts = 'favoritesHideContexts',
  hideSuperscripts = 'hideSuperscripts',
}

// maximum size of state.jumpHistory
export const MAX_JUMPS = 100

// max time attempting to connect before moving to offline mode (milliseconds)
export const WEBSOCKET_TIMEOUT = 3000

// See: cachedSettingsIds in pushQueue
export const CACHED_SETTINGS = ['Theme', 'Tutorial', 'Tutorial Step']

/** The number of jumpHistory paths to preserve during deallocation. */
export const FREE_THOUGHT_JUMPS = 3

/** The number of additional thoughts to free when the threshold is reached. This provides some slack so that freeThoughts is not triggered on every action. */
export const FREE_THOUGHTS_MARGIN = 50

/** The maximum size of the thoughtIndex before freeThoughts kicks in to free memory. */
// e.g. Art • Buddhist Art • :: • Regions • China • Period • Era of North-South division • North • East • Northern Qi
// = 455 thoughts loaded into memory
export const FREE_THOUGHTS_THRESHOLD = 500

/** Throttle rate for the freeThoughts middleware to check memory pressure and deallocate thoughts from the thoughtIndex. */
export const FREE_THOUGHTS_THROTTLE = 1000

/** Controls the delay when enabling distraction free typing. */
export const THROTTLE_DISTRACTION_FREE_TYPING = 100

/** The animation duration of a node in the LayoutTree component. */
export const LAYOUT_NODE_ANIMATION_DURATION = 150
