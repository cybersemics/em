import Shortcut from '../@types/Shortcut'
import { joinActionCreator as join } from '../actions/join'
import JoinThoughtsIcon from '../components/icons/JoinThoughtsIcon'

const joinThoughts: Shortcut = {
  id: 'join',
  label: 'Join Thoughts',
  description: 'join all siblings and merge their children',
  keyboard: { key: 'i', alt: true, shift: true },
  multicursor: {
    enabled: true,
    clearMulticursor: true,
    execMulticursor: (cursors, dispatch) => {
      dispatch(join({ paths: cursors }))
    },
  },
  svg: JoinThoughtsIcon,
  canExecute: state => !!state.cursor,
  exec: dispatch => {
    dispatch(join({}))
  },
}

export default joinThoughts
