import { store } from '../store.js'
import { isMobile } from '../browser.js'
import { openShortcutPopupSVG } from '../svgs'

export default {
  id: 'openShortcutPopup',
  name: 'Open Shortcut Popup',
  description: `Open the help screen which contains the tutorials and a list of all ${isMobile ? 'gestures' : 'keyboard shortcuts'}.`,
  keyboard: { key: '/', meta: true },
  openShortcutPopupSVG,
  exec: e => {
    window.scrollTo(0, 0)
    store.dispatch({ type: 'showModal', id: 'help' })
  }
}
