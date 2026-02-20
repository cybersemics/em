import waitForSelector from './waitForSelector'

/** Waits for the text or background color swatch to be visible and returns the selector. */
const waitForColorSwatches = async (type: 'text' | 'background', color: string) => {
  const selector = `[aria-label="${type} color swatches"] [aria-label="${color}"]`
  await waitForSelector(selector, { visible: true, timeout: 5000 })
  return selector
}

export default waitForColorSwatches
