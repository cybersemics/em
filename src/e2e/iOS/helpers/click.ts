/** Click a node by selector. */
const click = async (selector: string) => {
  const el = $(selector)

  await browser.execute(function (el) {
    if (!el) throw new Error('Element not found in the DOM.')
    el.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    el.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    el.click()
  }, el)
}

export default click
