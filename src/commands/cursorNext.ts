import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { cursorNextActionCreator as cursorNext } from '../actions/cursorNext'
import NextIcon from '../components/icons/NextIcon'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorNextCommand = {
  id: 'cursorNext',
  label: 'Next Thought',
  description: 'Move the cursor to the next thought, skipping expanded children.',
  multicursor: false,
  keyboard: { key: Key.ArrowDown, meta: true },
  svg: NextIcon,
  exec: throttleByAnimationFrame(dispatch => dispatch(cursorNext())),
} satisfies Command

export default cursorNextCommand
