import { store } from '../store.js'
import { isMobile } from '../browser.js'

export default {
  id: 'openShortcutPopup',
  name: 'Open Shortcut Popup',
  description: `Open the help screen which contains the tutorials and a list of all ${isMobile ? 'gestures' : 'keyboard shortcuts'}.`,
  keyboard: { key: '/', meta: true },
  exec: e => {
    window.scrollTo(0, 0)
    store.dispatch({ type: 'showHelper', id: 'shortcuts' })
  }
}
