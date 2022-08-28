import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import setAttribute from '../action-creators/setAttribute'
import toggleAttribute from '../action-creators/toggleAttribute'
import PinChildrenIcon from '../components/icons/PinChildrenIcon'
import { HOME_PATH } from '../constants'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

const pinSubthoughtsShortcut: Shortcut = {
  id: 'pinSubthoughts',
  label: 'Pin Open Subthoughts',
  description: "Pin open the current thought's subthoughts.",
  keyboard: { key: 'p', meta: true, shift: true },
  svg: PinChildrenIcon,
  canExecute: getState => !!getState().cursor,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)

    // if the user used the keyboard to activate the shortcut, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const pinned = findDescendant(state, head(simplePath), ['=children', '=pin', 'true'])
      dispatch(
        alert(pinned ? 'Unpinned subthoughts' : 'Pinned subthoughts', { clearDelay: 2000, showCloseLink: false }),
      )
    }

    const childrenAttributeId = findDescendant(getState(), head(simplePath), '=children')
    const value = attribute(getState(), childrenAttributeId, '=pin')

    dispatch([
      // if =children/=pin/true, toggle =children off
      // if =children/=pin/false, do nothing
      // otherwise toggle =children on
      ...(value !== 'false'
        ? [
            toggleAttribute({
              path: simplePath,
              values: ['=children', '=pin'],
            }),
          ]
        : []),
      // assume that =children exists
      (dispatch, getState) => {
        const childrenAttributeIdNew = findDescendant(getState(), head(simplePath), '=children')
        dispatch(
          setAttribute({
            path: appendToPath(simplePath, childrenAttributeIdNew!),
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

export default pinSubthoughtsShortcut
