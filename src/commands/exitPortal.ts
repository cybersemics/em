import Command from '../@types/Command'
import { exitPortalActionCreator as exitPortal } from '../actions/exitPortal'
import BackIcon from '../components/icons/BackIcon'
import nearestPortalPath from '../selectors/nearestPortalPath'

const exitPortalCommand = {
  id: 'exitPortal',
  label: 'Exit Portal' as const,
  description: 'Return to the entrance of the nearest context view, leaving that view open.',
  multicursor: false,
  svg: BackIcon,
  canExecute: state => !!nearestPortalPath(state, state.cursor),
  exec: dispatch => dispatch(exitPortal()),
} satisfies Command

export default exitPortalCommand
