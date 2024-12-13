import ShortcutInterface from '../@types/Shortcut'
import { isTouch } from '../browser'
import { formatKeyboardShortcut } from '../shortcuts'
import GestureDiagram from './GestureDiagram'

/** Renders the keyboard shortcut or gesture for a given shortcut. */
const Shortcut = ({ gesture, keyboard, overlay }: ShortcutInterface): JSX.Element | null => {
  const key = overlay && overlay.keyboard ? overlay.keyboard : keyboard
  return isTouch ? (
    gesture && typeof gesture === 'string' ? (
      <GestureDiagram path={gesture} />
    ) : null
  ) : key ? (
    <>{formatKeyboardShortcut(key)}</>
  ) : null
}

export default Shortcut
