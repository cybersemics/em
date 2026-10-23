// PROTOTYPE — which ellipse, if any, is being edited on canvas (the light, the radial blur or the mask), shared by the dials
// panel and the canvas editors. Delete with them once the values are baked.
import { useEffect, useState } from 'react'

/** Fired on window by a canvas editor to set one dial; the panel listens and applies it like a control change. */
export const DIAL_SET_EVENT = 'sort-dropdown-dial-set'

/** Fired on window when canvas editing starts, stops or switches to another ellipse. */
const EDITING_EVENT = 'sort-dropdown-canvas-editing'

/** The ellipses that can be edited on canvas. */
export type CanvasTarget = 'light' | 'blur' | 'mask'

/** The ellipse being edited, or null. Module state, so the panel's buttons and the editors share it. */
let editing: CanvasTarget | null = null

/** Starts editing one ellipse (which stops editing any other), or stops editing with null. */
export const setCanvasEditing = (target: CanvasTarget | null) => {
  editing = target
  window.dispatchEvent(new Event(EDITING_EVENT))
}

/** Asks the panel to set one dial, as a canvas drag does. */
export const setDial = (name: string, value: string) =>
  window.dispatchEvent(new CustomEvent(DIAL_SET_EVENT, { detail: { name, value } }))

/** The ellipse being edited on canvas, or null; re-renders when it changes. */
const useCanvasEditing = () => {
  const [target, setTarget] = useState<CanvasTarget | null>(editing)
  useEffect(() => {
    /** Follows the module state. */
    const onChange = () => setTarget(editing)
    window.addEventListener(EDITING_EVENT, onChange)
    return () => window.removeEventListener(EDITING_EVENT, onChange)
  }, [])
  return target
}

export default useCanvasEditing
