import { page } from '../setup'

/** Gets the computed styles. See: https://github.com/puppeteer/puppeteer/issues/696. */
const editableComputedStyles = async (value: string) => {
  const styles = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[data-editable]')).find(element => element.innerHTML === 'b')

    if (!el) return undefined

    return JSON.parse(JSON.stringify(getComputedStyle(el)))
  })

  return styles
}

export default editableComputedStyles
