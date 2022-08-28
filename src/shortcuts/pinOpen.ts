import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import toggleAttribute from '../action-creators/toggleAttribute'
import PinIcon from '../components/icons/PinIcon'
import { HOME_PATH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

const pinOpenShortcut: Shortcut = {
  id: 'pinOpen',
  label: 'Pin Open',
  description: 'Pin and expand the current thought.',
  keyboard: { key: 'p', meta: true, alt: true },
  svg: PinIcon,
  canExecute: getState => !!getState().cursor,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    // if the user used the keyboard to activate the shortcut, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const pinned = attributeEquals(state, head(cursor), '=pin', 'true')
      dispatch(alert(pinned ? 'Unpinned thought' : 'Pinned thought', { clearDelay: 2000, showCloseLink: false }))
    }

    dispatch(
      toggleAttribute({
        path: cursor,
        values: ['=pin', 'true'],
      }),
    )
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return attributeEquals(state, head(path), '=pin', 'true')
  },
}

export default pinOpenShortcut
