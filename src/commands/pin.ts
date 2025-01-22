import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import PinIcon from '../components/icons/PinIcon'
import { HOME_PATH } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import isPinned from '../selectors/isPinned'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

const pinShortcut: Command = {
  id: 'pin',
  label: 'Pin',
  labelInverse: 'Unpin',
  description: 'Pins open a thought so its subthoughts are always visible.',
  descriptionInverse: 'Unpins a thought so its subthoughts are automatically hidden.',
  keyboard: { key: 'p', meta: true, alt: true },
  svg: PinIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  multicursor: {
    enabled: true,
    execMulticursor(cursors, dispatch, getState, e, {}, execAll) {
      const numThougths = cursors.length

      execAll()

      dispatch(
        alert(`Pinned ${numThougths} thoughts.`, {
          clearDelay: 2000,
          showCloseLink: false,
        }),
      )
    },
  },
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    // if the user used the keyboard to activate the command, show an alert describing the sort direction
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
  isActive: state => {
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return !!isPinned(state, head(path))
  },
}

export default pinShortcut
