import virtualKeyboardStore from '../stores/virtualKeyboardStore'

interface AutoscrollBounds {
  /** Crossing below this viewport coordinate triggers a scroll. */
  bottom: number
  /** Height of the fixed bottom navigation. */
  navbarHeight: number
  /** Crossing above this viewport coordinate triggers a scroll. */
  top: number
  /** Height of the fixed toolbar. */
  toolbarHeight: number
  /** Height of the viewport available above the virtual keyboard. */
  visibleHeight: number
}

/** Returns the viewport coordinates that bound the cursor's autoscroll comfort zone. */
const autoscrollBounds = (): AutoscrollBounds => {
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const navbarHeight = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect().height ?? 0
  const keyboardTargetHeight = virtualKeyboardStore.getState().targetHeight
  const visibleHeight = keyboardTargetHeight
    ? window.innerHeight - keyboardTargetHeight
    : (window.visualViewport?.height ?? window.innerHeight)

  return {
    bottom: visibleHeight - navbarHeight,
    navbarHeight,
    top: toolbarRect?.bottom ?? 0,
    toolbarHeight: toolbarRect?.height ?? 0,
    visibleHeight,
  }
}

export default autoscrollBounds
