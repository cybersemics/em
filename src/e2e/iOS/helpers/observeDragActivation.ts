/** The record kept on the page between installing the observer and reading it back. */
interface DragActivation {
  dragHold: boolean
  dragInProgress: boolean
}

/**
 * Starts recording whether drag-and-drop activates, and returns a reader for the record.
 *
 * Em marks a press and a drag with data-drag-hold and data-drag-in-progress on the body — the same states that
 * highlight the bullet and raise the drag-and-drop alert on screen. Both end when the finger lifts, and a WebDriver
 * action chain does not return until then, so the state has to be recorded as it happens rather than sampled
 * afterwards.
 */
const observeDragActivation = async (): Promise<() => Promise<DragActivation>> => {
  await browser.execute(() => {
    const record: DragActivation = { dragHold: false, dragInProgress: false }
    ;(window as unknown as { __dragActivation: DragActivation }).__dragActivation = record

    /** Latches each state the first time the body reports it. */
    const update = () => {
      if (document.body.getAttribute('data-drag-hold') === 'true') record.dragHold = true
      if (document.body.getAttribute('data-drag-in-progress') === 'true') record.dragInProgress = true
    }

    update()
    new MutationObserver(update).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-drag-hold', 'data-drag-in-progress'],
    })
  })

  return () => browser.execute(() => (window as unknown as { __dragActivation: DragActivation }).__dragActivation)
}

export default observeDragActivation
