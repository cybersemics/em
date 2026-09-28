import Command from '../@types/Command'
import { cursorForwardActionCreator as cursorForward } from '../actions/cursorForward'
import CursorForwardIcon from '../components/icons/CursorForwardIcon'

const cursorForwardCommand = {
  id: 'cursorForward',
  description: 'Move the cursor down a level.',
  longDescription: (
    <>
      <p>Move the cursor down into the first subthought of the currently focused thought.</p>
      <p>Use Forward to drill into the detail of a thought you have just landed on.</p>
      <p>
        Forward is the inverse of Back — together they let you traverse the tree depth-wise without lifting a finger.
      </p>
    </>
  ),
  hideAlert: true,
  label: 'Forward' as const,
  multicursor: false,
  gesture: 'l',
  svg: CursorForwardIcon,
  exec: dispatch => dispatch(cursorForward()),
} satisfies Command

export default cursorForwardCommand
