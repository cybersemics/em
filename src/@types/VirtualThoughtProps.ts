import { ConnectDropTarget } from 'react-dnd'
import LazyEnv from './LazyEnv'
import Path from './Path'
import SimplePath from './SimplePath'
import ThoughtId from './ThoughtId'

interface VirtualThoughtProps {
  depth: number
  dropTarget?: ConnectDropTarget
  env?: LazyEnv
  indexChild: number
  indexDescendant: number
  last?: boolean
  leaf: boolean
  path?: Path
  prevChildId?: ThoughtId
  nextChildId?: ThoughtId
  simplePath: SimplePath
  showContexts?: boolean
}

export default VirtualThoughtProps
