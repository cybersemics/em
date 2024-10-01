import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { cursorPrevActionCreator as cursorPrev } from '../actions/cursorPrev'
import Icon from '../components/icons/PrevIcon'
// import directly since util/index is not loaded yet when shortcut is initialized
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorPrevShortcut: Shortcut = {
  id: 'cursorPrev',
  label: 'Previous Thought',
  description: 'Move the cursor to the previous thought.',
  gesture: 'lur',
  svg: Icon,
  keyboard: { key: Key.ArrowUp, meta: true },
  exec: throttleByAnimationFrame(dispatch => dispatch(cursorPrev())),
}

export default cursorPrevShortcut
