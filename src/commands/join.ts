import Command from '../@types/Command'
import { joinActionCreator as join } from '../actions/join'
import JoinThoughtsIcon from '../components/icons/JoinThoughtsIcon'

const joinThoughts: Command = {
  id: 'join',
  label: 'Join Thoughts',
  description: 'Join all thoughts at the same level into a single thought.',
  keyboard: { key: 'j', alt: true },
  multicursor: {
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
