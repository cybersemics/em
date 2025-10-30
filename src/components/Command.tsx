import React from 'react'
import CommandInterface from '../@types/Command'
import { isTouch } from '../browser'
import { formatKeyboardShortcut } from '../commands'
import GestureDiagram from './GestureDiagram'

/** Renders the keyboard shortcut or gesture for a given command. */
const Command = ({ gesture, keyboard, overlay, rounded }: CommandInterface): React.JSX.Element | null => {
  const key = overlay && overlay.keyboard ? overlay.keyboard : keyboard
  return isTouch ? (
    gesture ? (
      <GestureDiagram path={gesture[0]} rounded={rounded} />
    ) : null
  ) : key ? (
    <>{formatKeyboardShortcut(key)}</>
  ) : null
}

export default Command
