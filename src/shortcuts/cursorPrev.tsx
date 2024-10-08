import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { cursorPrevActionCreator as cursorPrev } from '../actions/cursorPrev'
import PrevIcon from '../components/icons/PrevIcon'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorPrevShortcut: Shortcut = {
  id: 'cursorPrev',
  label: 'Previous Thought',
  description: 'Move the cursor to the previous thought.',
  gesture: 'lur',
  svg: PrevIcon,
  keyboard: { key: Key.ArrowUp, meta: true },
  exec: throttleByAnimationFrame(dispatch => dispatch(cursorPrev())),
}

export default cursorPrevShortcut
