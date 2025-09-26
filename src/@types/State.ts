import DropThoughtZone from '../@types/DropThoughtZone'
import { LongPressState } from '../constants'
import ActionType from './ActionType'
import Alert from './Alert'
import Command from './Command'
import CommandId from './CommandId'
import Context from './Context'
import DragCommandZone from './DragCommandZone'
import Index from './IndexType'
import Modal from './Modal'
import Patch from './Patch'
import Path from './Path'
import PushBatch from './PushBatch'
import RecentlyEditedTree from './RecentlyEditedTree'
import SimplePath from './SimplePath'
import StorageCache from './StorageCache'
import ThoughtIndices from './ThoughtIndices'
import Timestamp from './Timestamp'
import Tip from './TipId'

interface State {
  absoluteContextTime?: Timestamp
  /** A dismissable informational popup. See actions/alert.ts and components/Alert.tsx. */
  alert?: Alert | null
  archived?: boolean
  authenticated: boolean
  autologin: boolean
  /** Key: hashPath(path). */
  contextViews: Index<boolean>
  cursor: Path | null
  /**
   * Set to true when clearThought is activated.
   * Temporarily renders the cursor thought as an empty string for quickly changing the entire value.
   * See: /actions/cursorCleared.
   */
  cursorCleared: boolean
  cursorBeforeQuickAdd: Path | null
  cursorBeforeSearch: Path | null
  cursorHistory: Path[]
  /**
   * Tracks if the cursor has been restored from the url on first load and ensures it only happens once.
   * See: updateUrlHistory.
   * See: initializeCursor in initialize.
   */
  cursorInitialized: boolean
  /**
   * The offset of the caret within the cursor, relative to the start of the thought.
   * Currently only 0 and n are used, where n is the length of the thought.
   * A value of null means that the caret is not forcefully set on re-render, allowing the device to set it, e.g. on click.
   */
  cursorOffset: number | null
  /** SimplePath of thought with drag hold activated. */
  draggedSimplePath?: SimplePath
  /** Set to true when dragging a native file. */
  draggingFile?: boolean
  /** Set to the dragging thoughts during dragInProgress. Dragging Thoughts are always maintained in the document order. */
  draggingThoughts: SimplePath[]

  /** Dragging a command or toolbar button in the customizeToolbar modal. */
  dragCommand?: CommandId | null
  /** Type of toolbar-sbutton drop target being hovered over. */
  dragCommandZone?: DragCommandZone
  /** Path of a parent that should remain highlighted briefly after a drop. */
  droppedPath?: Path | null
  /**
   * Forces content editable to update inner html if html has not changed.
   * TODO: Do we really need to re-render all ContentEditables?
   * Is there a state value we can subscribe to re-render only thoughts that are needed?
   */
  editableNonce: number
  /** True if there is an active browser selection, or on mobile when the virtual keyboard is up. On mobile the first tap moves the cursor, and the second tap opens the keyboard. */
  isKeyboardOpen: boolean | null
  /** Show the latest activated commands at the bottom of the screen for webcasts. */
  enableLatestCommandsDiagram: boolean
  error?: string | null
  /** A map of all Paths that are expanded. Recalculated whenever the cursor moves or the thoughts change. Keyed by hashPath(path). */
  expanded: Index<Path>
  /** Expand thoughts during drag-and-drop by hovering over them. Tracked separately from state.expanded so they can be toggled on/off independently from autoexpansion. */
  expandHoverDownPath?: Path | null
  /** Make hidden ancestors visible during drag-and-drop by hovering over them. This allows a thought to be dragged anywhere, even to thoughts that are initially hidden by autofocus. */
  expandHoverUpPath?: Path | null
  fontSize: number
  /**
   * Thought currently being hovered over.
   * Used to determine the parent of state.hoveringPath to be highlighted (via isChildHovering in the Thought components), expandHoverDown/Top, and the visibility of drop-hover elements.
   */
  hoveringPath?: Path
  /** Type of thought drop target being hovered over. */
  hoverZone?: DropThoughtZone
  /** The path where thoughts are being imported by importFiles. Prevents the path from being deallocated by freeThoughts. */
  importThoughtPath: Path | null
  invalidState: boolean
  /**
   * Displays a loading screen when the app starts.
   * This is disabled by updateThoughts once it detects that the root thought is loaded.
   * Used by the Content component to determine if there are no root children and EmptyThoughtspace should be displayed.
   */
  isLoading: boolean
  /**
   * Set to true when commands are being executed with multicursor.
   * Used by the undoRedoEnhancer to group undo patches for multicursor operations.
   */
  isMulticursorExecuting: boolean
  /**
   * History of edit points that can be navigated with the jump command.
   * New edit points are added to the beginning of the list.
   * Cannot use undoHistory because it omits the cursor from some edits.
   * i.e. It causes the 'jump after new subthought' to fail.
   */
  jumpHistory: (Path | null)[]
  /** The current index of the jump history that is being navigated.
   * Increments on each activation of Jump Back, and determines where the cursor is moved on Jump Forward.
   */
  jumpIndex: number
  /** The last undoable action that was executed. Usually this is the same as undoPatches.at(-1).actions[0]. However, on undo this will equal redoPatches.at(-1).actions[0]. This is important for special case animatons, like swapParent, that should be enabled not just when the action is originally executed, but also when it is reversed via undo. */
  lastUndoableActionType?: ActionType
  latestCommands: Command[]
  /** Tracks the state of long press and drag-and-drop. */
  longPress: LongPressState
  /** When a context is sorted, the manual sort order is saved so that it can be recovered when they cycle back through the sort options. If new thoughts have been added, their order relative to the original thoughts will be indeterminate, but both the old thoughts and the new thoughts will be sorted relative to themselves. The outer Index is keyed by parent ThoughtId, and the inner Index stores the manual ranks of each child at the time the context is sorted. This is stored in memory only and is lost when the app refreshes. */
  manualSortMap: Index<Index<number>>
  modals: Index<{ complete?: boolean }>
  multicursors: Index<Path>
  /** NoteFocus is true if the caret is on the note. */
  noteFocus: boolean
  /** NoteOffset can be used to position the caret within a note. Setting it to null disables programmatic selection using selection.set. */
  noteOffset: number | null
  /**
   * Temporarily stores updates that need to be persisted.
   * Passed to Yjs and cleared on every action.
   * See: /redux-enhancers/pushQueue.ts.
   */
  pushQueue: PushBatch[]
  recentlyEdited: RecentlyEditedTree
  /** Redo history. Contains diffs that can be applied to State to restore actions that were reverted with undo. State.redoPatches[0] is the oldest action that was undone. */
  redoPatches: Patch[]
  remoteSearch: boolean
  resourceCache: Index<string>
  rootContext: Context
  schemaVersion: number
  search: string | null
  searchContexts: Index<Context> | null
  searchLimit?: number
  showColorPicker?: boolean
  showLetterCase?: boolean
  showCommandPalette: boolean
  showHiddenThoughts: boolean
  showSortPicker?: boolean
  showCommandMenu: boolean
  /**
   * The currently shown modal dialog box.
   * Initialized to the welcome modal, unless already completed.
   * See: /src/actions/closeModal.ts.
   */
  showModal?: Modal | null
  showSidebar: boolean
  showGestureCheatsheet?: boolean
  showUndoSlider?: boolean
  /* Status:
      'disconnected'   Logged out or yet to connect, but not in explicit offline mode.
      'connecting'     Connecting.
      'loading'        Connected, authenticated, and waiting for first user data payload.
      'loaded'         User data payload received (may or may not be offline).
      'offline'        Disconnected and working in offline mode.
    */
  status: string
  /**
   * Thought values that are needed on startup before thoughts have loaded (e.g. theme, tutorial, etc) are cached to local storage.
   * StorageCache is populated initially with the values in local storage and updated as the state changes.
   * See: /redux-enhancers/storageCache.ts.
   */
  storageCache?: StorageCache
  thoughts: ThoughtIndices
  tip: Tip | null
  /** Command of a toolbar button that is being long pressed in the customize modal. */
  toolbarLongPress?: Command
  transientFocus?: boolean
  /** Undo history. Contains diffs that can be applied to State to revert actions. State.undoPatches[0] is the oldest. */
  undoPatches: Patch[]
}

export default State
