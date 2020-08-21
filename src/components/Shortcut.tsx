import React from 'react'
import { isMobile } from '../browser'
import { Shortcut as ShortcutInterface } from '../types'
import { formatKeyboardShortcut } from '../shortcuts.js'
import GestureDiagram from './GestureDiagram'

/** Renders the keyboard shortcut or gesture for a given shortcut. */
const Shortcut = ({ gesture, keyboard, overlay }: ShortcutInterface) => {
  const key = overlay && overlay.keyboard ? overlay.keyboard : keyboard
  return isMobile ? gesture ? <GestureDiagram path={gesture} /> : null
    : key ? formatKeyboardShortcut(key)
    : null
}

export default Shortcut
