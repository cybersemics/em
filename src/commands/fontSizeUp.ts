import { isTauri } from '@tauri-apps/api/core'
import Command from '../@types/Command'
import fontSizeUp from '../actions/fontSizeUp'
import SettingsIcon from '../components/icons/SettingsIcon'

const fontSizeUpCommand = {
  id: 'fontSizeUp',
  label: 'Increase Font Size' as const,
  systemMenu: 'View',
  description: 'Increase the font size. Bigger is better!',
  // Desktop app only. A browser tab keeps Command/Ctrl + = for its own zoom, which makes em larger already.
  keyboard: isTauri() ? { key: '=', meta: true } : undefined,
  // Changing the font size leaves the thoughtspace alone, and browser zoom works over a dialog too, e.g. to try a size from Settings.
  allowExecuteFromModal: true,
  multicursor: false,
  // TODO: Create unique icon
  svg: SettingsIcon,
  exec: dispatch => {
    dispatch(fontSizeUp())
  },
} satisfies Command

export default fontSizeUpCommand
