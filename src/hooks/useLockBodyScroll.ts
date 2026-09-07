import { useEffect } from 'react'

/** Prevents the document body from scrolling while locked, e.g. behind an open drawer or modal. Restores scrolling when unlocked or unmounted. */
const useLockBodyScroll = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [locked])
}

export default useLockBodyScroll
