/**
 * Waits for em to refresh WebKit's native history step after a native undo/redo gesture.
 *
 * `handleNativeHistory` registers the step a moment after each gesture it handles, once its own re-render of the
 * editable has landed. Until it does, WebKit has no live step to offer and dispatches no
 * `historyUndo`/`historyRedo` `beforeinput`, so a shake taken before then reaches em nowhere (#5575).
 *
 * The step is registered by inserting a marker into the focused editing host and immediately undoing it, so it has
 * already come and gone by the time any assertion could read the DOM. A `MutationObserver` catches the insertion
 * itself, which is the only moment the step is observable from the page.
 *
 * Call this as the first thing after the gesture, ahead of any other wait — the watcher only sees insertions that
 * follow it being armed, and the registration lands about a second later.
 */
const waitForNativeHistoryStep = async (): Promise<void> => {
  await browser.execute(() => {
    const w = window as unknown as { nativeHistoryStep?: boolean; nativeHistoryStepObserver?: MutationObserver }
    w.nativeHistoryStep = false
    if (w.nativeHistoryStepObserver) return
    w.nativeHistoryStepObserver = new MutationObserver(records => {
      const registered = records.some(record =>
        Array.from(record.addedNodes).some(
          node =>
            node instanceof Element &&
            (node.matches('[data-native-history]') || !!node.querySelector('[data-native-history]')),
        ),
      )
      if (registered) w.nativeHistoryStep = true
    })
    w.nativeHistoryStepObserver.observe(document.documentElement, { childList: true, subtree: true })
  })

  try {
    await browser.waitUntil(() =>
      browser.execute(() => !!(window as unknown as { nativeHistoryStep?: boolean }).nativeHistoryStep),
    )
  } catch {
    throw new Error('Expected em to register a native history step in WebKit, but none was registered.')
  }
}

export default waitForNativeHistoryStep
