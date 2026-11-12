import { page } from '../session'
import getPixels from './getPixels'

/** Reads the painted pixels inside a thought's text bounds (see getPixels). */
const getThoughtPixels = async (value: string): Promise<number[][]> => {
  const clip = await page.evaluate(value => {
    const editable = [...document.querySelectorAll('[data-editable]')].find(element => element.textContent === value)
    if (!editable) throw new Error(`Thought "${value}" not found.`)
    const range = document.createRange()
    range.selectNodeContents(editable)
    const { x, y, width, height } = range.getBoundingClientRect()
    return { x, y, width, height }
  }, value)

  return getPixels(clip)
}

export default getThoughtPixels
