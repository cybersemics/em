import tap from './tap'
import waitForElement from './waitForElement'

/** Click a node by selector. */
const click = async (selector: string) => {
  const el = await waitForElement(selector, { timeout: 10000 })

  if (!el) throw new Error(`editable node for the given selector(${selector}) not found.`)

  await tap(el)
}

export default click
