import Command from '../@types/Command'
import { joinActionCreator as join } from '../actions/join'
import JoinThoughtsIcon from '../components/icons/JoinThoughtsIcon'
import isAttributeSelected from '../selectors/isAttributeSelected'

const joinThoughts = {
  id: 'join',
  label: 'Join Thoughts' as const,
  description: 'Join all thoughts at the same level into a single thought.',
  keyboard: { key: 'j', alt: true },
  multicursor: {
    clearMulticursor: true,
    execMulticursor: (cursors, dispatch) => {
      dispatch(join({ paths: cursors }))
    },
  },
  svg: JoinThoughtsIcon,
  canExecute: state => !!state.cursor && !isAttributeSelected(state),
  exec: dispatch => {
    dispatch(join({}))
  },
} satisfies Command

export default joinThoughts
