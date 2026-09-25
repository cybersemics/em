import RecentlyEditedTree from '../@types/RecentlyEditedTree'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import mergeUpdates from '../util/mergeUpdates'

export type UpdateThoughtsOptions = Parameters<ThoughtspaceTransaction['update']>[0] & {
  /** Invoked after SQLite acknowledges the complete command. */
  idbSynced?: () => void
  local?: boolean
  remote?: boolean
  cursorOffset?: number
  recentlyEdited?: RecentlyEditedTree
  /** By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought. */
  preventExpandThoughts?: boolean
}

/**
 * Updates lexemeIndex and thoughtIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (
  state: State,
  {
    cursorOffset,
    thoughtIndexUpdates,
    recentlyEdited,
    preventExpandThoughts,
    movePlacements,
    local = true,
    remote = true,
    idbSynced,
  }: UpdateThoughtsOptions,
  document?: ThoughtspaceTransaction,
) => {
  if (!Object.keys(thoughtIndexUpdates).length) return state
  if (!document) throw new Error('Document updates require a thoughtspace transaction')
  const persistent = local || remote
  const thoughts = persistent
    ? document.update({ thoughtIndexUpdates, movePlacements }, state.thoughts)
    : document.project({
        ...state.thoughts,
        thoughtIndex: mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates),
      })
  if (persistent && idbSynced) document.afterPersist(idbSynced)
  const next = {
    ...state,
    thoughts,
    ...(cursorOffset != null ? { cursorOffset } : null),
    recentlyEdited: recentlyEdited || state.recentlyEdited,
  }
  return preventExpandThoughts ? next : { ...next, expanded: expandThoughts(next, next.cursor) }
}

/** Action-creator for updateThoughts. */
export const updateThoughtsActionCreator =
  (payload: Parameters<typeof updateThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'updateThoughts', ...payload })

export default command(updateThoughts)

// Register this action's metadata
registerActionMetadata('updateThoughts', {
  undoable: false,
})
