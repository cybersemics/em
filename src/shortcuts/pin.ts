import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import PinIcon from '../components/icons/PinIcon'
import { HOME_PATH } from '../constants'
import isPinned from '../selectors/isPinned'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

const pinShortcut: Shortcut = {
  id: 'pin',
  label: 'Pin',
  labelInverse: 'Unpin',
  description: 'Pins open a thought so its subthoughts are always visible.',
  descriptionInverse: 'Unpins a thought so its subthoughts are automatically hidden.',
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
      const pinned = isPinned(state, head(cursor))
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
    return isPinned(state, head(path)) ?? false
  },
}

export default pinShortcut
