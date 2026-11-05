/**
 * Get the rendered height of the toolbar in CSS pixels.
 * A picker is rendered inside the toolbar button that opens it, so the toolbar grows to fit an open picker. Its height
 * therefore changing while a picker stays open means the picker's layout shifted (#4263).
 * Uses the global browser object from WDIO.
 */
const getToolbarHeight = (): Promise<number> =>
  browser.execute(() => {
    const toolbar = document.getElementById('toolbar')
    if (!toolbar) throw new Error('No toolbar found')
    return toolbar.getBoundingClientRect().height
  })

export default getToolbarHeight
