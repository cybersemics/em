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
  onPersisted?: () => void
  /** Author document operations. False only updates transient editor overlays. Default: true. */
  persist?: boolean
  cursorOffset?: number
  recentlyEdited?: RecentlyEditedTree
  /** By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought. */
  preventExpandThoughts?: boolean
}

/** Updates lexemeIndex and thoughtIndex with any number of thoughts. */
const updateThoughts = (
  state: State,
  {
    cursorOffset,
    thoughtIndexUpdates,
    recentlyEdited,
    preventExpandThoughts,
    movePlacements,
    persist = true,
    onPersisted,
  }: UpdateThoughtsOptions,
  transaction?: ThoughtspaceTransaction,
) => {
  if (!Object.keys(thoughtIndexUpdates).length) return state
  if (!transaction) throw new Error('Document updates require a thoughtspace transaction')
  const thoughts = persist
    ? transaction.update({ thoughtIndexUpdates, movePlacements }, state.thoughts)
    : transaction.project({
        ...state.thoughts,
        thoughtIndex: mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates),
      })
  if (persist && onPersisted) transaction.afterPersist(onPersisted)
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
