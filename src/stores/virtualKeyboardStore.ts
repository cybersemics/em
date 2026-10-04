import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import reactMinistore from './react-ministore'
import viewportStore from './viewportStore'

/** A store that tracks the state of the virtual keyboard.
 * Its value is updated by platform-specific handlers (see `src/device/virtual-keyboard/handlers/`). */
const virtualKeyboardStore = reactMinistore<VirtualKeyboardState>({
  open: false,
  height: 0,
  openPercent: 0,
  phase: undefined,
})

// Progress is derived state shared by all platform handlers; presentation subscribes separately.
virtualKeyboardStore.subscribeSelector(
  state => (state.open ? state.height : 0),
  height => {
    const targetHeight = viewportStore.getState().virtualKeyboardHeight
    virtualKeyboardStore.update({ openPercent: targetHeight > 0 ? Math.min(height / targetHeight, 1) : 0 })
  },
)

export default virtualKeyboardStore
