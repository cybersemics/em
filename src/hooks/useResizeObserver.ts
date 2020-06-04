import { RefObject, useLayoutEffect } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

/** Hoke to add resizeObserver on the passed ref and call the callback function on resize. */
const useResizeObserver = (ref: RefObject<HTMLElement>, onResize: () => void) => {

  useLayoutEffect(() => {
    if (ref.current === null) {
      return;
    }

    const ro = new ResizeObserver(onResize);
    ro.observe(ref.current!);

    return () => ro.disconnect()
  }, []);
}
export default useResizeObserver
