import { DROP_TARGET } from '../constants'
import { Alert } from './Alert'
import { Context } from './Context'
import { Index } from './IndexType'
import { InviteCodes } from './InviteCodes'
import { Patch } from './Patch'
import { Path } from './Path'
import { PushBatch } from './PushBatch'
import { RecentlyEditedTree } from './RecentlyEditedTree'
import { Shortcut } from './Shortcut'
import { SimplePath } from './SimplePath'
import { ThoughtsInterface } from './ThoughtsInterface'
import { Timestamp } from './Timestamp'
import { User } from './Firebase'

export interface State {
  alert?: Alert
  archived?: boolean
  authenticated: boolean
  autologin: boolean
  contextViews: Index<boolean>
  cursor: Path | null
  cursorBeforeQuickAdd: Path | null
  cursorBeforeSearch: Path | null
  cursorHistory: Path[]
  cursorInitialized: boolean
  cursorOffset: number | null
  draggedSimplePath?: SimplePath
  draggingThought?: SimplePath
  dragHold?: boolean
  dragInProgress: boolean
  editableNonce: number
  editing: boolean | null
  editingValue: string | null
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
  inversePatches: Patch[]
  invitationCode?: string | null
  invite?: InviteCodes
  invites: InviteCodes[]
  isLoading: boolean
  isPushing?: boolean
  lastUpdated?: string
  modals: Index<{ complete?: boolean }>
  noteFocus: boolean
  patches: Patch[]
  pushQueue: PushBatch[]
  recentlyEdited: RecentlyEditedTree
  remoteSearch: boolean
  resourceCache: Index<string>
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
  rootContext: Context
  absoluteContextTime?: Timestamp
  transientFocus?: boolean
  status: string
  thoughts: ThoughtsInterface
  toolbarOverlay?: string | null
  tutorialStep?: number
  user?: User
  latestShortcuts: Shortcut[]
  enableLatestShorcutsDiagram: boolean
}
