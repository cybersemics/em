import scheduleScrollCursorIntoView from './scheduleScrollCursorIntoView'

/** Scrolls the content to the top, the bottom, or a given scrollTop. Always scrolls instantly in integration tests, ignoring the passed behavior. */
const scrollTo = (target: 'top' | 'bottom' | number, behavior?: ScrollBehavior) => {
  const top =
    typeof target === 'number' ? target : target === 'top' ? 0 : target === 'bottom' ? document.body.scrollHeight : null

  if (top === null) {
    throw new Error('Unrecognized scrollTo target: ' + target)
  }

  // Every caller is a deliberate move of the viewport, so a scroll the cursor queued before it is stale. Without this,
  // a cursor scroll that is still pending lands up to 400 ms later and undoes the scroll that was just asked for, e.g.
  // Escape and Home both clear the cursor (which schedules a cursor scroll) and then scroll to the top.
  scheduleScrollCursorIntoView.cancel()

  window.scrollTo({
    top,
    left: 0,
    behavior: navigator.webdriver ? 'instant' : behavior,
  })
}

export default scrollTo
