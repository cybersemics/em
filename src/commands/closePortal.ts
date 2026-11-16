import Command from '../@types/Command'
import { closePortalActionCreator as closePortal } from '../actions/closePortal'
import HomeToolbarIcon from '../components/icons/HomeToolbarIcon'
import nearestPortalPath from '../selectors/nearestPortalPath'

const closePortalCommand = {
  id: 'closePortal',
  label: 'Close Portal' as const,
  description: 'Stay at the selected thought in its original branch and close the traversed portal route behind it.',
  multicursor: false,
  svg: HomeToolbarIcon,
  canExecute: state => !!nearestPortalPath(state, state.cursor),
  exec: dispatch => dispatch(closePortal()),
} satisfies Command

export default closePortalCommand
