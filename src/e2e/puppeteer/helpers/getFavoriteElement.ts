import { page } from '../setup'

/** Extract the thought text from a favorite element.*/
export const extractFavoriteText = (el: Element): string => {
  const links = Array.from(el.querySelectorAll('div>a'))
  return links.find(link => link.textContent?.trim() !== '')?.textContent ?? ''
}

/**
 * Get all favorite elements from the sidebar.
 */
export const getFavoriteElements = () => page.$$('.favorites div[draggable="true"]')

/**
 * Get favorite element handle for the given thought value.
 * Finds the draggable favorite item that contains the specified text.
 */
const getFavoriteElement = async (value: string) => {
  const elements = await getFavoriteElements()

  for (const element of elements) {
    const text = await element.evaluate(extractFavoriteText)

    if (text === value) {
      return element
    }
  }

  throw new Error(`Favorite element with text "${value}" not found`)
}

export default getFavoriteElement
