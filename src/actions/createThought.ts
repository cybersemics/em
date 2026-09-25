import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import createId from '../util/createId'
import head from '../util/head'
import timestamp from '../util/timestamp'

interface Payload {
  id?: ThoughtId
  /** Invoked after SQLite acknowledges the complete command. */
  onPersisted?: () => void
  path: Path
  /** Preceding sibling, or null to insert first. */
  afterId: ThoughtId | null
  splitSource?: ThoughtId
  value: string
}
/**
 * Creates a new thought at an explicit sibling position. Does not update the cursor.
 */
const createThought = (
  state: State,
  { path, value, afterId, id, onPersisted, splitSource }: Payload,
  document?: ThoughtspaceTransaction,
) => {
  id = id || createId()
  const parentId = head(path)
  const parent = getThoughtById(state, parentId)

  if (!parent) {
    console.error({ path, value, afterId, id, onPersisted, splitSource })
    throw new Error(`createThought: Parent thought with id ${parentId} not found`)
  }

  const thoughtIndexUpdates: Index<Thought> = {}

  const thoughtNew: Thought = {
    // A new thought has no children yet. A caller that needs children creates them with further createThought calls
    // once this thought exists, so the parent's childrenMap never references a thought that is not in the index.
    childrenMap: {},
    created: timestamp(),
    id,
    lastUpdated: timestamp(),
    parentId: parentId,
    rank: 0,
    updatedBy: clientId,
    value,
    ...(splitSource ? { splitSource } : null),
  }

  thoughtIndexUpdates[id] = thoughtNew
  thoughtIndexUpdates[parentId] = {
    ...parent,
    id: parentId,
    lastUpdated: timestamp(),
    updatedBy: clientId,
  }

  return updateThoughts(state, { thoughtIndexUpdates, movePlacements: { [id]: afterId }, onPersisted }, document)
}

/** Action-creator for createThought. */
export const createThoughtActionCreator =
  (payload: Parameters<typeof createThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'createThought', ...payload })

export default command(createThought)

// Register this action's metadata
registerActionMetadata('createThought', {
  undoable: true,
})
