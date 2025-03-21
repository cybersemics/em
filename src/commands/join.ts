import Command from '../@types/Command'
import { joinActionCreator as join } from '../actions/join'
import JoinThoughtsIcon from '../components/icons/JoinThoughtsIcon'

const joinThoughts: Command = {
  id: 'join',
  label: 'Join Thoughts',
  description: 'join all siblings and merge their children',
  keyboard: { key: 'j', alt: true },
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
