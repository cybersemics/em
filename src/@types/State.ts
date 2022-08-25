import DropThoughtZone from '../@types/DropThoughtZone'
import Alert from './Alert'
import Context from './Context'
import { User } from './Firebase'
import Index from './IndexType'
import Patch from './Patch'
import Path from './Path'
import PushBatch from './PushBatch'
import RecentlyEditedTree from './RecentlyEditedTree'
import Shortcut from './Shortcut'
import SimplePath from './SimplePath'
import ThoughtIndices from './ThoughtIndices'
import Timestamp from './Timestamp'

interface State {
  absoluteContextTime?: Timestamp
  alert?: Alert | null
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
  // SimplePath of thought with drag hold activated
  draggedSimplePath?: SimplePath
  draggingThought?: SimplePath
  // set to true while the user is long pressing a thought in preparation for a drag
  dragHold?: boolean
  // set to true while the user is dragging a thought
  // may be set to false to abort the drag even while react-dnd is still dragging (e.g. by shaking)
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
  // drop target thought currently being hovered over
  hoveringPath?: Path
  // type of drop target being hovered over
  hoverZone?: DropThoughtZone
  invalidState: boolean
  isLoading: boolean
  isPushing?: boolean
  // history of edit points that can be navigated with the jump command
  // cannot use undoHistory because it omits the cursor from some edits
  // e.g. This jump test fails: 'jump after new subthought'
  jumpHistory: (Path | null)[]
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
  showColorPicker?: boolean
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
  thoughts: ThoughtIndices
  toolbarOverlay?: string | null
  transientFocus?: boolean
  tutorialStep?: number
  undoPatches: Patch[]
  user?: User
}

export default State
