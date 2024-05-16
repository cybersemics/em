import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import { toggleContextViewActionCreator as toggleContextView } from '../actions/toggleContextView'
import isContextViewActive from '../selectors/isContextViewActive'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => (
  <svg
    version='1.1'
    className='icon'
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill={fill}
    style={style}
    viewBox='0 0 24 24'
    enableBackground='new 0 0 24 24'
  >
    <path d='M18.5,3A2.5,2.5,0,0,0,18,7.95V12.5a.501.501,0,0,1-.5.5H12V7.95a2.5,2.5,0,1,0-1,0V13H5.5a.5006.5006,0,0,1-.5-.5V7.95a2.5,2.5,0,1,0-1,0V12.5A1.5017,1.5017,0,0,0,5.5,14H11v3.05a2.5,2.5,0,1,0,1,0V14h5.5A1.5017,1.5017,0,0,0,19,12.5V7.95A2.5,2.5,0,0,0,18.5,3ZM10,5.5A1.5,1.5,0,1,1,11.5,7,1.5017,1.5017,0,0,1,10,5.5Zm-7,0A1.5,1.5,0,1,1,4.5,7,1.5017,1.5017,0,0,1,3,5.5Zm10,14A1.5,1.5,0,1,1,11.5,18,1.5017,1.5017,0,0,1,13,19.5ZM18.5,7A1.5,1.5,0,1,1,20,5.5,1.5017,1.5017,0,0,1,18.5,7Z' />
  </svg>
)

const toggleContextViewShortcut: Shortcut = {
  id: 'toggleContextView',
  label: 'Context View',
  description:
    'Opens the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found. Use the same shortcut to close the context view.',
  descriptionInverse:
    'Closes the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found.',
  gesture: 'ru',
  keyboard: { key: 's', shift: true, alt: true },
  svg: Icon,
  canExecute: getState => !!getState().cursor,
  isActive: getState => {
    const state = getState()
    return !!state.cursor && isContextViewActive(getState(), state.cursor)
  },
  exec: dispatch => dispatch(toggleContextView()),
}

export default toggleContextViewShortcut
