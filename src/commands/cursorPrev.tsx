import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { cursorPrevActionCreator as cursorPrev } from '../actions/cursorPrev'
import PrevIcon from '../components/icons/PrevIcon'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorPrevCommand: Command = {
  id: 'cursorPrev',
  label: 'Previous Thought',
  description: 'Move the cursor to the previous thought.',
  gesture: 'lur',
  multicursor: 'ignore',
  svg: PrevIcon,
  keyboard: { key: Key.ArrowUp, meta: true },
  exec: throttleByAnimationFrame(dispatch => dispatch(cursorPrev())),
  rounded: true,
}

export default cursorPrevCommand
