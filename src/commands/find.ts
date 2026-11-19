import Command from '../@types/Command'
import { showFindBarActionCreator as showFindBar } from '../actions/showFindBar'
import { isTouch } from '../browser'

const findCommand = {
  id: 'find',
  label: 'Find' as const,
  description:
    'Find text in the visible thoughts. Enter and Shift + Enter step through the matches, and Escape moves the cursor to the current one.',
  systemMenu: 'Edit',
  multicursor: false,
  // Command/Ctrl + F, which the browser would otherwise take for its own find bar.
  keyboard: { key: 'f', meta: true },
  // The find bar is desktop only (see AppComponent). On a touch device with a hardware keyboard, the shortcut is left to
  // the browser's own find, since keyDown prevents the default only of a command that can execute.
  canExecute: () => !isTouch,
  exec: dispatch => dispatch(showFindBar({ value: true })),
} satisfies Command

export default findCommand
