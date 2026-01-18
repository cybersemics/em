/* eslint-disable import/prefer-default-export */
/** Defines app-wide constants. */
import CommandId from './@types/CommandId'
import SimplePath from './@types/SimplePath'
import ThoughtId from './@types/ThoughtId'
import { ColorToken } from './colors.config'
import emojiRegex from './emojiRegex'

// maximum number of characters of children to allow expansion
export const MAX_DISTANCE_FROM_CURSOR = 3
export const MAX_DEPTH = 20

// Number of ms to wait after hovering over a thought before expanding, during drag-and-drop. Overriden by testFlags.expandHoverDelay during drag-and-drop tests.
export const EXPAND_HOVER_DELAY = 1000

// threshold for keyboard visibility detection (percentage of height change)
export const KEYBOARD_VISIBILITY_THRESHOLD = 0.15

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

export const LATEST_COMMAND_DIAGRAM_DURATION = 800

// number of latest commands to show at a time
export const LATEST_COMMAND_LIMIT = 3

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
export const noop = () => {}

// prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
export const AUTO_PROSE_VIEW_MIN_CHARS = 200

/** The left and right padding of each toolbar button (px). */
export const TOOLBAR_BUTTON_PADDING = 8

// Used for scaling the size of icons according to the font size
export const ICON_SCALING_FACTOR = 1.37

// the base font of the browser used to calculate the scaling ratio
export const BASE_FONT_SIZE = 16

export const MIN_FONT_SIZE = 8
export const DEFAULT_FONT_SIZE = 18
export const MAX_FONT_SIZE = 40
export const FONT_SCALE_INCREMENT = 1

// to detect if field has multiline
export const MIN_LINE_HEIGHT = 26

// delay after gesture hint is activated before command palette appears
export const COMMAND_PALETTE_TIMEOUT = 400

// delay to show executed command after gesture is completed
export const GESTURE_HINT_TIMEOUT = 5000

// number of recently edited thoughts to store
export const RECENTLY_EDITED_THOUGHTS_LIMIT = 100

// maximum number of chars to show in url before ellipsizing
export const URL_MAX_CHARS = 40

// to expand thought ends with ':'
export const EXPAND_THOUGHT_CHAR = ':'
export const MAX_EXPAND_DEPTH = 10

/** The “3 em” minimum content width for a thought node. */
export const MIN_CONTENT_WIDTH_EM = 3

// command ids of default buttons that appear in the toolbar
// otherwise read from Settings thought
export const TOOLBAR_DEFAULT_COMMANDS: CommandId[] = [
  'undo',
  'redo',
  'toggleUndoSlider',
  'favorite',
  'outdent',
  'indent',
  'swapParent',
  'pin',
  'pinAll',
  'toggleTableView',
  'toggleSortPicker',
  'toggleDone',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'textColor',
  'letterCase',
  'toggleContextView',
  'note',
  'categorize',
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
  // 'uncategorize',
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
  // 'newSubthoughtTop',
  // 'newThoughtAbove',
  // 'newUncle',
  // 'proseView',
  // 'search',
  // 'textColor',
  // 'toggleDone',
  // 'toggleSort',
  // 'toggleSidebar',
]

// Throttle editThought when user is typing.
// See: thoughtChangeHandler in Editable.tsx.
export const EDIT_THROTTLE = 500

// matches a string with only punctuation
export const REGEX_PUNCTUATIONS = /^\W+$/i

/** Matches any HTML tags. */
export const REGEX_HTML = /<\/?[a-z][\s\S]*>/i

// matches HTML tags
// can be used to replace all HTML in a string
export const REGEX_TAGS = /(<([^>]+)>)/gi

/** Matches HTML tags that indicate the snippet is a block of proper HTML, not just text formatted with HTML tags. Includes <html>, <body>, <li>, <meta>, <ol>, <ul>. Does not match strings that just contain formattings tags like <b>, <i>, or <u>. */
export const REGEX_NONFORMATTING_HTML = /<(html|\!doctype|li|meta|ol|ul)/i

// starts with '-', '—' (emdash), ▪, ◦, •, or '*'' (excluding whitespace)
// '*'' must be followed by a whitespace character to avoid matching *footnotes or *markdown italic*
export const REGEX_PLAINTEXT_BULLET = /^\s*(?:[-—▪◦•]|\*\s)/m

export const IPFS_GATEWAY = 'ipfs.infura.io'

// delay before long press is activated
// also used for react-dnd's delayTouchStart
export const TIMEOUT_LONG_PRESS_THOUGHT = 400

// number of pixels of scrolling to allow before abandoning the long tap
export const TOUCH_SLOP = 10

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

export const ALLOWED_FORMATTING_TAGS = ['b', 'i', 'u', 'em', 'strong', 'span', 'strike', 'code', 'font']

export const EXTERNAL_FORMATTING_TAGS = ['b', 'i', 'u', 'strong', 'strike']
export const ALLOWED_TAGS = ['ul', 'li', 'br', ...ALLOWED_FORMATTING_TAGS]

export const ALLOWED_ATTR = ['class', 'style', 'color']

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
  DragAndDropToolbar: 'Drag and drop to reorder toolbar',
  DragAndDropToolbarAdd: 'Drag and drop to add to toolbar',
  ReorderFavorites: 'Drag and drop to reorder favorites',
}

export enum AlertType {
  // shown when a dragged thought is hovering over the DeleteDrop component
  DeleteDropHint = 'DeleteDropHint',
  // shown when dragging a thought
  DragAndDropHint = 'DragAndDropHint',
  // shown when dragging a toolbar button
  DragAndDropToolbarHint = 'DragAndDropToolbarHint',
  // shown when dragging a toolbar button from the command table
  DragAndDropToolbarAdd = 'DragAndDropToolbarAdd',
  // shown during a MultiGesture
  GestureHint = 'GestureHint',
  // shown when importing one or more files via drag-and-drop or a large paste
  ImportFile = 'ImportFile',
  // shown when a multicursor selection is active
  MulticursorActive = 'MulticursorActive',
  // shown when a multicursor selection is active
  MulticursorError = 'MulticursorError',
  // shown when the user redoes an action
  Redo = 'Redo',
  // shown when the user attempts to open the Command Center without a cursor multiple times within 10 seconds
  ScrollZoneHelp = 'ScrollZoneHelp',
  // shown when a toolbar button is hovering over the area for removal in the CustomizeToolbar modal
  ToolbarButtonRemoveHint = 'ToolbarButtonRemoveHint',
  // shown when the user undoes an action
  Undo = 'Undo',
}

/** A discrete state machine that tracks the state of long press and drag-and-drop. See the longPress reducer for valid transitions. */
export enum LongPressState {
  /** No long press or drag-and-drop action is in progress. */
  Inactive = 'Inactive',
  /** The user has pressed a thought for longer than TIMEOUT_LONG_PRESS_THOUGHT without moving more than SCROLL_THRESHOLD px in order to activate the long press state.  */
  DragHold = 'DragHold',
  /** The user is currently dragging a thought. */
  DragInProgress = 'DragInProgress',
  /** The drag has been canceled, but the user has not released their finger from the screen. */
  DragCanceled = 'DragCanceled',
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

// max time attempting to connect before moving to offline mode (milliseconds)
export const WEBSOCKET_TIMEOUT = 3000

// See: cachedSettingsIds in pushQueue
export const CACHED_SETTINGS = ['Theme', 'Tutorial', 'Tutorial Step']

/** The number of jumpHistory paths to preserve during deallocation. */
export const FREE_THOUGHT_JUMPS = 3

/** The number of additional thoughts to free when the threshold is reached. This provides some slack so that freeThoughts is not triggered on every action. */
export const FREE_THOUGHTS_MARGIN = 50

/** Throttle rate for the freeThoughts middleware to check memory pressure and deallocate thoughts from the thoughtIndex. */
export const FREE_THOUGHTS_THROTTLE = 1000

/** The animation duration for a toolbar button press. */
export const TOOLBAR_PRESS_ANIMATION_DURATION = 80

export const GESTURE_GLOW_BLUR = 10
export const GESTURE_GLOW_COLOR: ColorToken = 'highlight'

// define the grouping and ordering of commands
export const COMMAND_GROUPS: {
  title: string
  commands: CommandId[]
}[] = [
  {
    title: 'Navigation',
    commands: [
      'cursorBack',
      'cursorForward',
      'cursorNext',
      'cursorPrev',
      'jumpBack',
      'jumpForward',
      'moveCursorBackward',
      'moveCursorForward',
      'commandPalette',
      'home',
      'search',
      'selectAll',
      'selectBetween',
    ],
  },
  {
    title: 'Creating thoughts',
    commands: [
      'categorize',
      'newThought',
      'newThoughtAbove',
      'newSubthought',
      'newSubthoughtTop',
      'newUncle',
      'newGrandChild',
      'extractThought',
      'generateThought',
    ],
  },
  {
    title: 'Deleting thoughts',
    commands: ['delete', 'archive', 'uncategorize', 'clearThought'],
  },
  {
    title: 'Moving thoughts',
    commands: ['indent', 'outdent', 'bumpThoughtDown', 'moveThoughtDown', 'moveThoughtUp', 'swapParent'],
  },
  {
    title: 'Editing thoughts',
    commands: [
      'join',
      'splitSentences',
      'bold',
      'italic',
      'strikethrough',
      'underline',
      'code',
      'copyCursor',
      'closeCommandCenter',
      'openCommandCenter',
      'removeFormat',
    ],
  },
  {
    title: 'Oops',
    commands: ['undo', 'redo'],
  },
  {
    title: 'Special Views',
    commands: [
      'note',
      'swapNote',
      'toggleContextView',
      'proseView',
      'toggleTableView',
      'toggleSort',
      'heading0',
      'heading1',
      'heading2',
      'heading3',
      'heading4',
      'heading5',
    ],
  },
  {
    title: 'Visibility',
    commands: ['pin', 'pinAll', 'toggleDone', 'toggleHiddenThoughts'],
  },
  {
    title: 'Settings',
    commands: ['customizeToolbar'],
  },
  {
    title: 'Help',
    commands: ['help', 'openGestureCheatsheet'],
  },
  {
    title: 'Cancel',
    commands: ['cancel'],
  },
]

/** The duration of the haptics vibrate on delete or archive non-empty thought. */
export const DELETE_VIBRATE_DURATION = 80

/** Right padding and Left padding of the Content component in px. */
export const CONTENT_BOX_PADDING_RIGHT = 10
export const CONTENT_BOX_PADDING_LEFT = 50
