/**
 * Get the rendered height of the toolbar in CSS pixels.
 * Its height changing while a picker stays open means the layout of the button that opened the picker shifted (#4263).
 * Uses the global browser object from WDIO.
 */
const getToolbarHeight = (): Promise<number> =>
  browser.execute(() => {
    const toolbar = document.getElementById('toolbar')
    if (!toolbar) throw new Error('No toolbar found')
    return toolbar.getBoundingClientRect().height
  })

export default getToolbarHeight
