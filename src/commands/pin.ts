import pluralize from 'pluralize'
import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { pinActionCreator as pin } from '../actions/pin'
import PinIcon from '../components/icons/PinIcon'
import { HOME_PATH } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import isPinned from '../selectors/isPinned'
import parentContextId from '../selectors/parentContextId'

const pinCommand = {
  id: 'pin',
  label: 'Pin' as const,
  labelInverse: 'Unpin',
  description: 'Pins open a thought so its subthoughts are always visible.',
  descriptionInverse: 'Unpins a thought so its subthoughts are automatically hidden.',
  keyboard: { key: 'p', meta: true, alt: true },
  gesture: 'ud',
  svg: PinIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  multicursor: {
    onComplete(filteredCursors, dispatch) {
      dispatch(alert(`Pinned ${pluralize('thought', filteredCursors.length, true)}.`))
    },
  },
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    // if the user used the keyboard to activate the command, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const pinned = isPinned(state, parentContextId(state, cursor))
      dispatch(alert(pinned ? 'Unpinned thought' : 'Pinned thought'))
    }

    dispatch(pin())
  },
  isActive: state => {
    const { cursor } = state
    // =pin is set on the thought the user sees, which in the context view is the context rather than the Lexeme context
    return !!isPinned(state, parentContextId(state, cursor ?? HOME_PATH))
  },
} satisfies Command

export default pinCommand
