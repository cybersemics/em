import Command from '../@types/Command'
import { jumpActionCreator as jump } from '../actions/jump'
import JumpBackIcon from '../components/icons/JumpBackIcon'

const jumpBackCommand = {
  id: 'jumpBack',
  label: 'Jump Back',
  description: 'Move the cursor to the last thought that was edited.',
  keyboard: { key: 'j', meta: true },
  gesture: 'lul',
  multicursor: false,
  svg: JumpBackIcon,
  exec: dispatch => {
    dispatch(jump(-1))
  },
} satisfies Command

export default jumpBackCommand
