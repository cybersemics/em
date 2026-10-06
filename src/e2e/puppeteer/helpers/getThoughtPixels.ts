import { page } from '../session'
import screenshot from './screenshot'

/** Reads the painted pixels inside a thought's text bounds, using the shared screenshot stabilization. An offscreen canvas decodes the image without changing the page DOM. */
const getThoughtPixels = async (value: string): Promise<number[][]> => {
  const clip = await page.evaluate(value => {
    const editable = [...document.querySelectorAll('[data-editable]')].find(element => element.textContent === value)
    if (!editable) throw new Error(`Thought "${value}" not found.`)
    const range = document.createRange()
    range.selectNodeContents(editable)
    const { x, y, width, height } = range.getBoundingClientRect()
    return { x, y, width, height }
  }, value)
  const png = await screenshot({ clip })

  return page.evaluate(async png => {
    const blob = await (await fetch(`data:image/png;base64,${png}`)).blob()
    const bitmap = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    const { data: pixels } = context.getImageData(0, 0, bitmap.width, bitmap.height)
    bitmap.close()
    return Array.from({ length: pixels.length / 4 }, (_, index) => [...pixels.slice(index * 4, index * 4 + 3)])
  }, png.toString('base64'))
}

export default getThoughtPixels
