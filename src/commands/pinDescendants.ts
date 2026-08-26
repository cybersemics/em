import pluralize from 'pluralize'
import Command from '../@types/Command'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import PinDescendantsIcon from '../components/icons/PinDescendantsIcon'
import { HOME_PATH } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isPinned from '../selectors/isPinned'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/** Returns true if =descendants contains child attribute settings other than =pin. */
const hasNonPinDescendantsAttribute = (state: State, descendantsAttributeId: ThoughtId | null) =>
  !!descendantsAttributeId &&
  getAllChildren(state, descendantsAttributeId).some(childId => getThoughtById(state, childId)?.value !== '=pin')

/** Gets the effective Pin Descendants mode and pin state for a thought. */
const getPinDescendantsState = (state: State, thoughtId: ThoughtId) => {
  const descendantsAttributeId = findDescendant(state, thoughtId, '=descendants')
  const descendantsPinAttributeId = findDescendant(state, descendantsAttributeId, '=pin')
  const hasNonPinDescendantsAttributeValue = hasNonPinDescendantsAttribute(state, descendantsAttributeId)

  return {
    descendantsAttributeId,
    pinned: isPinned(state, descendantsAttributeId),
    useExistingDescendantsAttribute:
      !!descendantsAttributeId && !descendantsPinAttributeId && hasNonPinDescendantsAttributeValue,
  }
}

const pinDescendantsCommand = {
  id: 'pinDescendants',
  label: 'Pin Descendants' as const,
  labelInverse: 'Unpin Descendants',
  description: 'Pins open all descendants of the current thought.',
  descriptionInverse: 'Unpins all descendants of the current thought.',
  keyboard: { key: 'p', meta: true, alt: true, shift: true },
  svg: PinDescendantsIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  multicursor: {
    onComplete(filteredCursors, dispatch) {
      dispatch(alert(`Pinned descendants of ${pluralize('thought', filteredCursors.length, true)}.`))
    },
  },
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)
    const thoughtId = head(simplePath)
    const { descendantsAttributeId, pinned, useExistingDescendantsAttribute } = getPinDescendantsState(state, thoughtId)

    // if the user used the keyboard to activate the command, show an alert describing the pin state
    // since the user won't have the visual feedback from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      dispatch(alert(pinned ? 'Unpinned descendants' : 'Pinned descendants'))
    }

    if (useExistingDescendantsAttribute && descendantsAttributeId) {
      dispatch(
        toggleAttribute({
          path: appendToPath(simplePath, descendantsAttributeId),
          values: ['=pin', 'true'],
        }),
      )
      return
    }

    /** Removes =descendants/=pin while preserving other =descendants attributes. */
    const unpinDescendants: Thunk = (dispatch, getState) => {
      const descendantsAttributeIdNew = findDescendant(getState(), thoughtId, '=descendants')
      if (!descendantsAttributeIdNew) return

      dispatch(deleteAttribute({ path: appendToPath(simplePath, descendantsAttributeIdNew), value: '=pin' }))

      const stateAfterDelete = getState()
      const descendantsAttributeIdAfterDelete = findDescendant(stateAfterDelete, thoughtId, '=descendants')

      if (
        descendantsAttributeIdAfterDelete &&
        getAllChildren(stateAfterDelete, descendantsAttributeIdAfterDelete).length === 0
      ) {
        dispatch(deleteAttribute({ path: simplePath, value: '=descendants' }))
      }
    }

    dispatch(
      pinned
        ? unpinDescendants
        : setDescendant({
            path: simplePath,
            values: ['=descendants', '=pin', 'true'],
          }),
    )
  },
  isActive: state => {
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return !!isPinned(state, findDescendant(state, head(path), '=descendants'))
  },
} satisfies Command

export default pinDescendantsCommand
