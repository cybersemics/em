import Autofocus from '../@types/Autofocus'
import Thought from '../@types/Thought'
import LazyEnv from './LazyEnv'
import Path from './Path'
import SimplePath from './SimplePath'
import ThoughtId from './ThoughtId'

/** 1st Pass: A thought with rendering information after the tree has been linearized. */
type TreeThought = {
  /** If true, the thought is rendered below the cursor (i.e. with a higher y value). This is used to crop hidden thoughts. */
  belowCursor: boolean
  depth: number
  env?: LazyEnv
  // index among visible siblings at the same level
  indexChild: number
  // index among all visible thoughts in the tree
  indexDescendant: number
  isCursor: boolean
  isEmpty: boolean
  isInSortedContext: boolean
  isTableCol1: boolean
  isTableCol2: boolean
  isTableCol2Child: boolean
  key: string
  leaf: boolean
  path: Path
  prevChild: Thought
  rank: number
  showContexts?: boolean
  simplePath: SimplePath
  // style inherited from parents with =children/=style and grandparents with =grandchildren/=style
  style?: React.CSSProperties | null
  thoughtId: ThoughtId
  isLastVisible?: boolean
  autofocus: Autofocus
  // keys of visible children
  // only used in table view to calculate the width of column 1
  visibleChildrenKeys?: string[]
}

export default TreeThought
