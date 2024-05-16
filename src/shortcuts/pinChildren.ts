import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import PinChildrenIcon from '../components/icons/PinChildrenIcon'
import { HOME_PATH } from '../constants'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

const pinChildrenShortcut: Shortcut = {
  id: 'pinChildren',
  label: 'Pin Subthoughts',
  labelInverse: 'Unpin Subthoughts',
  description: "Pins open the current thought's subthoughts.",
  descriptionInverse: "Unpins the current thought's subthoughts so their subthoughts are automatically hidden.",
  keyboard: { key: 'p', meta: true, shift: true },
  svg: PinChildrenIcon,
  canExecute: getState => !!getState().cursor,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)
    const thoughtId = head(simplePath)

    // if the user used the keyboard to activate the shortcut, show an alert describing the sort direction
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
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return !!findDescendant(state, head(path), ['=children', '=pin', 'true'])
  },
}

export default pinChildrenShortcut
