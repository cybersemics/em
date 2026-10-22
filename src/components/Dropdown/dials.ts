// PROTOTYPE — design dials plumbing, delete with DropdownDebugPanel once the values are baked.
//
// Most dials are CSS custom properties read with var() in the styles, so the browser applies them live. Two kinds
// need JavaScript as well: choices that change what is rendered (the opening placement, the glow's scope), and
// sizes the Dropdown measures to position the menu (row padding, font size). The panel fires DIALS_EVENT after
// every change; useDialsVersion re-renders on it, and readDial reads a property's current value.
import { useEffect, useState } from 'react'

/** Fired on window by the panel after it writes the custom properties. */
export const DIALS_EVENT = 'sort-dropdown-dials'

/** The current value of a custom property set on <html>, or the fallback when the panel has not set it. */
export const readDial = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/** Re-renders the calling component whenever a dial changes. */
const useDialsVersion = () => {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    /** Bumps the version so the component re-reads and re-measures. */
    const onChange = () => setVersion(v => v + 1)
    window.addEventListener(DIALS_EVENT, onChange)
    return () => window.removeEventListener(DIALS_EVENT, onChange)
  }, [])
  return version
}

export default useDialsVersion
