import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { dismissKeyboardActionCreator as dismissKeyboard } from '../../../actions/dismissKeyboard'
import store from '../../../stores/app'

/** Dispatches dismissKeyboard when the virtual keyboard is hidden (its occluded height collapses to 0). */
const onGeometryChange = () => {
  if (navigator.virtualKeyboard.boundingRect.height === 0) {
    store.dispatch(dismissKeyboard())
  }
}

/**
 * A virtual keyboard handler for Android mobile web (Chromium).
 *
 * The app declares `interactive-widget=overlays-content` (index.html), so the virtual keyboard overlays
 * content instead of resizing the viewport — visualViewport never fires a resize event for the keyboard.
 * Additionally, dismissing the keyboard via the Down Arrow virtual button (or the back button) does not blur
 * the editable, so no blur event fires to dismiss the caret. We opt into the Chromium VirtualKeyboard API and
 * listen to its geometrychange event to exit edit mode and clear the browser selection when the keyboard hides.
 *
 * Chromium also does not raise the keyboard when a thought enters edit mode by side effect, since the caret is
 * placed by setting the browser selection rather than by a tap, so the editable must be focused by script.
 *
 * See: https://github.com/cybersemics/em/issues/3958.
 */
const androidWebHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!('virtualKeyboard' in navigator)) return
    // Opt in to the VirtualKeyboard API so the keyboard overlays content and geometrychange events fire.
    navigator.virtualKeyboard.overlaysContent = true
    navigator.virtualKeyboard.addEventListener('geometrychange', onGeometryChange)
  },
  destroy: () => {
    if (!('virtualKeyboard' in navigator)) return
    navigator.virtualKeyboard.removeEventListener('geometrychange', onGeometryChange)
  },
  show: editable => {
    // Chromium raises the keyboard for a script-initiated focus during user activation (the gesture or
    // keypress that activated edit mode), but not for the implicit focus that setting the browser selection
    // performs. VirtualKeyboard.show() is not an option: it only works under virtualkeyboardpolicy="manual",
    // which would suppress the keyboard on every tap.
    editable.focus()
  },
}

export default androidWebHandler
