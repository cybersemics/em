// PROTOTYPE — the radial blur's canvas-editing state, shared by the dials panel and DropdownRadialBlurEditor. Delete
// with them once the values are baked.
import { useEffect, useState } from 'react'

/** Fired on window by the canvas editor to set one dial; the panel listens and applies it like a control change. */
export const DIAL_SET_EVENT = 'sort-dropdown-dial-set'

/** Fired on window when canvas editing is turned on or off. */
const EDITING_EVENT = 'sort-dropdown-blur-editing'

/** Whether the canvas editor is showing. Module state, so the panel's toggle and the editor share it. */
let editing = false

/** Turns the canvas editor on or off. */
export const setBlurEditing = (on: boolean) => {
  editing = on
  window.dispatchEvent(new Event(EDITING_EVENT))
}

/** Whether the canvas editor is on; re-renders when it changes. */
const useBlurEditing = () => {
  const [on, setOn] = useState(editing)
  useEffect(() => {
    /** Follows the module state. */
    const onChange = () => setOn(editing)
    window.addEventListener(EDITING_EVENT, onChange)
    return () => window.removeEventListener(EDITING_EVENT, onChange)
  }, [])
  return on
}

export default useBlurEditing
