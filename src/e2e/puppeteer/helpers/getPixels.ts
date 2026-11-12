import { page } from '../session'
import screenshot from './screenshot'

/** Reads the painted pixels inside a region of the page as [r, g, b] triples, using the shared screenshot stabilization. An offscreen canvas decodes the image without changing the page DOM. */
const getPixels = async (clip: { x: number; y: number; width: number; height: number }): Promise<number[][]> => {
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

export default getPixels
