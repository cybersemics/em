import { deleteThought } from '.'
import _ from 'lodash'
import BulletStyle from '../@types/BulletStyle'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import getBulletStyle from '../selectors/getBulletStyle'
import { getAllChildren } from '../selectors/getChildren'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import setDescendant from './setDescendant'

/** Removes `=children/=bullet` from a context, preserving other `=children` attributes and removing `=children` only if it becomes completely empty. */
const removeBulletStyle = (state: State, simplePath: SimplePath): State => {
  const thoughtId = head(simplePath)
  const childrenId = findDescendant(state, thoughtId, '=children')
  if (!childrenId) return state

  const bulletId = findDescendant(state, childrenId, '=bullet')
  if (!bulletId) return state

  // Delete only the =bullet subtree so sibling =children attributes (e.g. =style) are preserved.
  const stateNew = deleteThought(state, { pathParent: appendToPath(simplePath, childrenId), thoughtId: bulletId })

  // Remove =children if it is now completely empty (including hidden meta children).
  return getAllChildren(stateNew, childrenId).length === 0
    ? deleteThought(stateNew, { pathParent: simplePath, thoughtId: childrenId })
    : stateNew
}

/**
 * Sets the bullet style applied to a context's children via `=children/=bullet`.
 * Passing `null` restores the default filled bullet by removing `=children/=bullet`.
 * Only the `=bullet` attribute is affected; other `=children` attributes are preserved.
 * For `Time`, an optional step (5min, 15min, 30min, 1h) is written as the child of `Time`.
 */
const setBulletStyle = (
  state: State,
  { simplePath, value, step }: { simplePath: SimplePath; value: BulletStyle; step?: string },
): State => {
  if (!value) return removeBulletStyle(state, simplePath)

  // A Time list starts at the created timestamp of the Time thought (see getBulletTime). Editing another style in
  // place would keep that style's created timestamp, so replace the =bullet subtree instead. Once the list is already
  // Time, only the step is rewritten so that the start time is preserved.
  const stateReset =
    value === 'Time' && getBulletStyle(state, head(simplePath)) !== 'Time'
      ? removeBulletStyle(state, simplePath)
      : state

  return setDescendant(stateReset, {
    path: simplePath,
    values: ['=children', '=bullet', value, ...(value === 'Time' && step ? [step] : [])],
  })
}

/** Action-creator for setBulletStyle. */
export const setBulletStyleActionCreator =
  (payload: Parameters<typeof setBulletStyle>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setBulletStyle', ...payload })

export default _.curryRight(setBulletStyle, 2)

// Register this action's metadata
registerActionMetadata('setBulletStyle', {
  undoable: true,
})
