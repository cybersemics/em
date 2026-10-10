import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import getPreviousSiblingId from '../selectors/getPreviousSiblingId'
import getSortPreference from '../selectors/getSortPreference'
import getSortedPlacement from '../selectors/getSortedPlacement'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import createId from '../util/createId'
import head from '../util/head'
import isEmptyOrEmojiOnly from '../util/isEmptyOrEmojiOnly'
import timestamp from '../util/timestamp'

interface Payload {
  id?: ThoughtId
  /** Invoked after SQLite acknowledges the complete command. */
  onPersisted?: () => void
  path: Path
  /** Preceding sibling, or null to insert first. */
  afterId: ThoughtId | null
  /** Skip expansion when the composing command will refresh it after its writes. */
  preventExpandThoughts?: boolean
  splitSource?: ThoughtId
  value: string
}
/**
 * Creates a new thought at an explicit sibling position. Does not update the cursor.
 */
const createThought = (
  state: State,
  { path, value, afterId, id, onPersisted, splitSource, preventExpandThoughts }: Payload,
  transaction?: ThoughtspaceTransaction,
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
    created: timestamp(),
    id,
    lastUpdated: timestamp(),
    parentId: parentId,
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

  // A child change updates the parent's timestamp, so keep its Updated-sorted context in order.
  const movePlacements: Index<ThoughtId | null> = { [id]: afterId }
  if (getSortPreference(state, parent.parentId).type === 'Updated' && !isEmptyOrEmojiOnly(parent.value)) {
    const parentAfterId = getSortedPlacement(state, parent.parentId, parent.value, { staleId: parent.id })
    if (parentAfterId !== getPreviousSiblingId(state, parent.id)) movePlacements[parent.id] = parentAfterId
  }

  return updateThoughts(state, { thoughtIndexUpdates, movePlacements, onPersisted, preventExpandThoughts }, transaction)
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
