import CommandId from '../@types/CommandId'
import reactMinistore from './react-ministore'

/**
 * A command being dragged to pin or unpin it (see useCommandDrag and docs/learning.md). Null while nothing is dragged.
 * It is a ministore rather than Redux state because it changes on every pointer move, and nothing about it is undoable
 * or saved: only the drop changes the pin, through pinCommand or unpinCommand.
 */
export interface CommandDrag {
  commandId: CommandId
  /** Where the command was picked up: from the Command Universe to pin it, or from the pinned ring to unpin it. */
  source: 'universe' | 'pinned'
  /** The pointer, in viewport px. */
  x: number
  y: number
  /** How close the pointer is to the ring, from 0 (far) to 1 (at the magnet's edge), for the ring's fade-in. */
  proximity: number
  /** Within the magnet: the command has popped into the ring, and a release pins it. */
  magnetized: boolean
  /** Over the delete edge, having left the ring: a release unpins the command. Only for drags from the ring. */
  overEdge: boolean
}

const commandDragStore = reactMinistore<CommandDrag | null>(null)

export default commandDragStore
