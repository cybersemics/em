import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import reactMinistore from './react-ministore'
import viewportStore from './viewport'

/** A store that tracks the state of the virtual keyboard.
 * Its value is updated by platform-specific handlers (see `src/device/virtual-keyboard/handlers/`). */
const virtualKeyboardStore = reactMinistore<VirtualKeyboardState>({
  open: false,
  height: 0,
  openPercent: 0,
})

// Sync the store's height to CSS custom properties outside of React, so
// per-frame spring updates drive the DOM without triggering re-renders.
virtualKeyboardStore.subscribeSelector(
  state => state.height,
  height => {
    // Derive openPercent from the animated height relative to the target keyboard height.
    // When open is false, force to 0 — on iOS the closing animation settles at
    // safeAreaBottom (not 0), which would otherwise leave a residual percentage.
    const { open } = virtualKeyboardStore.getState()
    const targetHeight = viewportStore.getState().virtualKeyboardHeight
    const openPercent = open && targetHeight > 0 ? Math.min(height / targetHeight, 1) : 0
    virtualKeyboardStore.update({ openPercent })

    document.documentElement.style.setProperty('--virtual-keyboard-height', `${height}px`)
    document.documentElement.style.setProperty('--virtual-keyboard-open-percent', `${openPercent}`)
  },
)

export default virtualKeyboardStore
