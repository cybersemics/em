import ShortcutInterface from '../@types/Command'
import { isTouch } from '../browser'
import { formatKeyboardCommand } from '../commands'
import GestureDiagram from './GestureDiagram'

/** Renders the keyboard shortcut or gesture for a given shortcut. */
const Shortcut = ({ gesture, keyboard, overlay }: ShortcutInterface): JSX.Element | null => {
  const key = overlay && overlay.keyboard ? overlay.keyboard : keyboard
  return isTouch ? (
    gesture && typeof gesture === 'string' ? (
      <GestureDiagram path={gesture} />
    ) : null
  ) : key ? (
    <>{formatKeyboardCommand(key)}</>
  ) : null
}

export default Shortcut
