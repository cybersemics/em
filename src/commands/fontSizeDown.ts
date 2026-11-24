import { isTauri } from '@tauri-apps/api/core'
import Command from '../@types/Command'
import fontSizeDown from '../actions/fontSizeDown'
import SettingsIcon from '../components/icons/SettingsIcon'

const fontSizeDownCommand = {
  id: 'fontSizeDown',
  label: 'Decrease Font Size' as const,
  systemMenu: 'View',
  description: 'Decrease the font size. Get your reading glasses.',
  // Desktop app only. A browser tab keeps Command/Ctrl + - for its own zoom, which makes em smaller already.
  keyboard: isTauri() ? { key: '-', meta: true } : undefined,
  // Changing the font size leaves the thoughtspace alone, and browser zoom works over a dialog too, e.g. to try a size from Settings.
  allowExecuteFromModal: true,
  multicursor: false,
  // TODO: Create unique icon
  svg: SettingsIcon,
  exec: dispatch => {
    dispatch(fontSizeDown())
  },
} satisfies Command

export default fontSizeDownCommand
