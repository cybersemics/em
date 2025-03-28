import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import PinAllIcon from '../components/icons/PinAllIcon'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import hasMulticursor from '../selectors/hasMulticursor'
import isPinned from '../selectors/isPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

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

    // if the user used the keyboard to activate the command, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const pinned = findDescendant(state, thoughtId, ['=children', '=pin', 'true'])
      dispatch(
        alert(pinned ? 'Unpinned subthoughts' : 'Pinned subthoughts', {
          clearDelay: 2000,
          showCloseLink: false,
        }),
      )
    }

    const childrenAttributeId = findDescendant(state, thoughtId, '=children')
    const pinned = attribute(state, childrenAttributeId, '=pin')
    const childrenIds = getAllChildren(state, thoughtId)

    dispatch([
      // if =children/=pin/true, toggle =children off
      // if =children/=pin/false, do nothing
      // otherwise toggle =children on
      ...(pinned !== 'false'
        ? [
            toggleAttribute({
              path: simplePath,
              values: ['=children', '=pin'],
            }),
          ]
        : []),
      // if pinning on, remove =pin/false from all subthoughts
      ...(pinned !== 'true'
        ? childrenIds.map(childId =>
            deleteAttribute({ path: appendToPath(simplePath, childId), values: ['=pin', 'false'] }),
          )
        : []),
      // set =children/=pin/true
      // setDescendant does nothing if childrenAttributeIdNew no longer exists?
      (dispatch, getState) => {
        const childrenAttributeIdNew = findDescendant(getState(), thoughtId, '=children')
        if (!childrenAttributeIdNew) return false
        dispatch(
          setDescendant({
            path: appendToPath(simplePath, childrenAttributeIdNew),
            values: ['=pin', 'true'],
          }),
        )
      },
    ])
  },
  isActive: state => {
    if (!state.cursor || isRoot(state.cursor)) return false
    const path = simplifyPath(state, rootedParentOf(state, state.cursor))
    const childrenAttributeId = findDescendant(state, head(path), '=children')
    return !!isPinned(state, childrenAttributeId)
  },
}

export default pinAllCommand
