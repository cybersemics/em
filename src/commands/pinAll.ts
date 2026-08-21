import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { pinAllActionCreator as pinAll } from '../actions/pinAll'
import PinAllIcon from '../components/icons/PinAllIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isChildrenPinned from '../selectors/isChildrenPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
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

    // if the user used the keyboard to activate the command, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const pinned = isChildrenPinned(state, head(simplifyPath(state, rootedParentOf(state, cursor))))
      dispatch(alert(pinned ? 'Unpinned subthoughts' : 'Pinned subthoughts'))
    }

    dispatch(pinAll())
  },
  isActive: state => {
    const { cursor } = state
    if (!cursor || isRoot(cursor)) return false
    return !!isChildrenPinned(state, head(simplifyPath(state, rootedParentOf(state, cursor))))
  },
}

export default pinAllCommand
