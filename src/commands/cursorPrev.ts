import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { cursorPrevActionCreator as cursorPrev } from '../actions/cursorPrev'
import PrevIcon from '../components/icons/PrevIcon'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorPrevCommand = {
  id: 'cursorPrev',
  label: 'Previous Thought',
  description: 'Move the cursor to the previous thought.',
  multicursor: false,
  svg: PrevIcon,
  keyboard: { key: Key.ArrowUp, meta: true },
  exec: throttleByAnimationFrame(dispatch => dispatch(cursorPrev())),
  rounded: true,
} satisfies Command

export default cursorPrevCommand
