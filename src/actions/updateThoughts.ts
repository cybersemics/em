import _ from 'lodash'
import Index from '../@types/IndexType'
import RecentlyEditedTree from '../@types/RecentlyEditedTree'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

export type UpdateThoughtsOptions = {
  /** Authors document operations synchronously within the current command transaction. */
  write?: (transaction: ThoughtspaceTransaction) => void
  /** Replaces the supplied transient editor overlays; null removes one. */
  thoughtUiUpdates?: Index<State['thoughtUi'][string] | null>
  /** Invoked after SQLite acknowledges the complete command. */
  onPersisted?: () => void
  cursorOffset?: number
  recentlyEdited?: RecentlyEditedTree
  /** By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought. */
  preventExpandThoughts?: boolean
}

/** Applies document edits or sparse editor overlays and publishes their resulting view. */
const updateThoughts = (
  state: State,
  {
    cursorOffset,
    thoughtUiUpdates = {},
    recentlyEdited,
    preventExpandThoughts,
    write,
    onPersisted,
  }: UpdateThoughtsOptions,
  transaction?: ThoughtspaceTransaction,
) => {
  if (!write && !Object.keys(thoughtUiUpdates).length) return state
  if (!transaction) throw new Error('Document updates require a thoughtspace transaction')
  write?.(transaction)
  const thoughts = transaction.project()
  const thoughtUi = { ...state.thoughtUi }
  Object.entries(thoughtUiUpdates).forEach(([id, overlay]) => {
    const ui = {
      ...(overlay?.generating !== undefined && { generating: overlay.generating }),
      ...(overlay?.generating &&
        overlay.generatingPlaceholder !== undefined && { generatingPlaceholder: overlay.generatingPlaceholder }),
      ...(overlay?.pendingFormat !== undefined && { pendingFormat: overlay.pendingFormat }),
      ...(overlay?.splitSource !== undefined && { splitSource: overlay.splitSource }),
    }
    if (!overlay || !thoughts.getThought(id as ThoughtId) || !Object.keys(ui).length) delete thoughtUi[id]
    else if (!_.isEqual(ui, thoughtUi[id])) thoughtUi[id] = Object.freeze(ui)
  })
  if (write && onPersisted) transaction.afterPersist(onPersisted)
  const next = {
    ...state,
    thoughts,
    thoughtUi: _.isEqual(thoughtUi, state.thoughtUi) ? state.thoughtUi : thoughtUi,
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
