import { DROP_TARGET } from '../constants'
import Alert from './Alert'
import Context from './Context'
import Index from './IndexType'
import Patch from './Patch'
import Path from './Path'
import PushBatch from './PushBatch'
import RecentlyEditedTree from './RecentlyEditedTree'
import Shortcut from './Shortcut'
import SimplePath from './SimplePath'
import ThoughtsInterface from './ThoughtsInterface'
import Timestamp from './Timestamp'
import { User } from './Firebase'

interface State {
  absoluteContextTime?: Timestamp
  alert?: Alert
  // tracks when an alert is visible until it is dismissed and its close animation has completed
  // used by Toolbar to ensure that Toolbar buttons are not activated during swipe-to-dismiss
  alertActive?: boolean
  archived?: boolean
  authenticated: boolean
  autologin: boolean
  contextViews: Index<boolean>
  cursor: Path | null
  // set to true when clearThought is activated
  // temporarily renders the cursor thought as an empty string for quickly changing the entire value
  // see: /reducers/cursorCleared
  cursorCleared: boolean
  cursorBeforeQuickAdd: Path | null
  cursorBeforeSearch: Path | null
  cursorHistory: Path[]
  cursorInitialized: boolean
  // the offset of the caret within the cursor, relative to the start of the thought
  // currently only 0 and n are used, where n is the length of the thought
  // null means that the caret is no forcefully set on re-render, allowing the device to set it, e.g. on click
  cursorOffset: number | null
  draggedSimplePath?: SimplePath
  draggingThought?: SimplePath
  dragHold?: boolean
  dragInProgress: boolean
  // forces content editable to update inner html if html has not changed
  // TODO: Do we really need to re-render all ContentEditables?
  //   Is there a state value we can subscribe to re-render only thoughts that are needed?
  editableNonce: number
  editing: boolean | null
  editingValue: string | null
  enableLatestShorcutsDiagram: boolean
  error?: string | null
  expanded: Index<Path>
  expandedBottom: Index<Path>
  expandHoverBottomPaths: Index<Path>
  expandHoverTopPath?: Path | null
  expandedContextThought?: Path
  fontSize: number
  hoveringPath?: Path
  hoverId?: DROP_TARGET
  invalidState: boolean
  isLoading: boolean
  isPushing?: boolean
  lastUpdated?: string
  latestShortcuts: Shortcut[]
  modals: Index<{ complete?: boolean }>
  // noteFocus is true if the caret is on the note
  noteFocus: boolean
  pushQueue: PushBatch[]
  recentlyEdited: RecentlyEditedTree
  redoPatches: Patch[]
  remoteSearch: boolean
  resourceCache: Index<string>
  rootContext: Context
  schemaVersion: number
  scrollPrioritized: boolean
  search: string | null
  searchContexts: Index<Context> | null
  searchLimit?: number
  showHiddenThoughts: boolean
  showModal?: string | null
  showQueue?: boolean | null
  showSidebar: boolean
  showSplitView: boolean
  showTopControls: boolean
  showBreadcrumbs: boolean
  splitPosition: number
  /* status:
      'disconnected'   Logged out or yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'loading'        Connected, authenticated, and waiting for first user data payload.
      'loaded'         User data payload received (may or may not be offline).
      'offline'        Disconnected and working in offline mode.
    */
  status: string
  thoughts: ThoughtsInterface
  toolbarOverlay?: string | null
  transientFocus?: boolean
  tutorialStep?: number
  undoPatches: Patch[]
  user?: User
}

export default State
