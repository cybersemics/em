import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import reactMinistore from './react-ministore'

/** A store that tracks the state of the virtual keyboard.
 * Its value is updated by platform-specific handlers (see `src/device/virtual-keyboard/handlers/`). */
const virtualKeyboardStore = reactMinistore<VirtualKeyboardState>({
  open: false,
  height: 0,
})

export default virtualKeyboardStore
