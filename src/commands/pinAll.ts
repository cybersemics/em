import Command from '../@types/Command'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import PinAllIcon from '../components/icons/PinAllIcon'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isPinned from '../selectors/isPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

/** Returns true if =children contains child attribute settings other than =pin. */
const hasNonPinChildrenAttribute = (state: State, childrenAttributeId: ThoughtId | null) =>
  !!childrenAttributeId &&
  getAllChildren(state, childrenAttributeId).some(childId => getThoughtById(state, childId)?.value !== '=pin')

/** Gets the effective Pin All mode and pin state for a thought. */
const getPinAllState = (state: State, thoughtId: ThoughtId) => {
  const childrenAttributeId = findDescendant(state, thoughtId, '=children')
  const childrenPinAttributeId = findDescendant(state, childrenAttributeId, '=pin')
  const hasNonPinChildrenAttributeValue = hasNonPinChildrenAttribute(state, childrenAttributeId)

  return {
    childrenAttributeId,
    pinned: isPinned(state, childrenAttributeId),
    useExistingChildrenAttribute: !!childrenAttributeId && !childrenPinAttributeId && hasNonPinChildrenAttributeValue,
  }
}

const pinAllCommand: Command = {
  id: 'pinAll',
  label: 'Pin All',
  labelInverse: 'Unpin All',
  description: 'Pins open all thoughts at the current level.',
  descriptionInverse: 'Unpins all thoughts at the current level.',
  keyboard: { key: 'p', meta: true, shift: true },
  multicursor: false,
  svg: PinAllIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor || isRoot(cursor)) return

    const path = rootedParentOf(state, cursor)
    const simplePath = simplifyPath(state, path)
    const thoughtId = head(simplePath)
    const { childrenAttributeId, pinned, useExistingChildrenAttribute } = getPinAllState(state, thoughtId)

    // if the user used the keyboard to activate the command, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      dispatch(alert(pinned ? 'Unpinned subthoughts' : 'Pinned subthoughts'))
    }

    const childrenIds = getAllChildren(state, thoughtId)

    if (useExistingChildrenAttribute && childrenAttributeId) {
      dispatch(
        toggleAttribute({
          path: appendToPath(simplePath, childrenAttributeId),
          values: ['=pin', 'true'],
        }),
      )
      return
    }

    /** Removes =children/=pin while preserving other =children attributes. */
    const unpinChildren: Thunk = (dispatch, getState) => {
      const childrenAttributeIdNew = findDescendant(getState(), thoughtId, '=children')
      if (!childrenAttributeIdNew) return

      dispatch(deleteAttribute({ path: appendToPath(simplePath, childrenAttributeIdNew), value: '=pin' }))

      const stateAfterDelete = getState()
      const childrenAttributeIdAfterDelete = findDescendant(stateAfterDelete, thoughtId, '=children')

      if (
        childrenAttributeIdAfterDelete &&
        getAllChildren(stateAfterDelete, childrenAttributeIdAfterDelete).length === 0
      ) {
        dispatch(deleteAttribute({ path: simplePath, value: '=children' }))
      }
    }

    dispatch([
      // if =children/=pin is true, unpin all subthoughts
      ...(pinned
        ? [unpinChildren]
        : [
            // if pinning on, remove =pin/false from all subthoughts
            ...childrenIds.map(childId =>
              deleteAttribute({ path: appendToPath(simplePath, childId), values: ['=pin', 'false'] }),
            ),
            // set =children/=pin/true
            setDescendant({
              path: simplePath,
              values: ['=children', '=pin', 'true'],
            }),
          ]),
    ])
  },
  isActive: state => {
    if (!state.cursor || isRoot(state.cursor)) return false
    const path = simplifyPath(state, rootedParentOf(state, state.cursor))
    return !!getPinAllState(state, head(path)).pinned
  },
}

export default pinAllCommand
