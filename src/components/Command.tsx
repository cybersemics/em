import CommandInterface from '../@types/Command'
import { isTouch } from '../browser'
import { formatKeyboardShortcut } from '../commands'
import GestureDiagram from './GestureDiagram'

/** Renders the keyboard shortcut or gesture for a given command. */
const Command = ({ gesture, keyboard, overlay, rounded }: CommandInterface): JSX.Element | null => {
  const key = overlay && overlay.keyboard ? overlay.keyboard : keyboard
  return isTouch ? (
    gesture && typeof gesture === 'string' ? (
      <GestureDiagram path={gesture} rounded={rounded} />
    ) : null
  ) : key ? (
    <>{formatKeyboardShortcut(key)}</>
  ) : null
}

export default Command
