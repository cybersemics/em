import { ConnectDropTarget } from 'react-dnd'
import Path from './Path'
import SimplePath from './SimplePath'
import ThoughtId from './ThoughtId'

interface VirtualThoughtProps {
  depth: number
  dropTarget?: ConnectDropTarget
  indexChild: number
  indexDescendant: number
  path?: Path
  prevChildId: ThoughtId
  nextChildId: ThoughtId
  simplePath: SimplePath
  showContexts?: boolean
}

export default VirtualThoughtProps
