import { page } from '../session'
import waitForBrowserSettled from './waitForBrowserSettled'

/** Waits until the element's CSS background image has been decoded and painted. An element that carries a background image is in the DOM before its image is available to the renderer, so waiting for the selector alone leaves a screenshot taken immediately afterwards nondeterministic: the frame may be captured without the image. Decoding the same URL resolves once the bitmap is ready, and settling the browser lets the frame that includes it be painted. */
const waitForBackgroundImage = async (selector: string) => {
  await page.waitForFunction(
    async (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return false

      const url = getComputedStyle(element).backgroundImage.match(/url\("?(.+?)"?\)/)?.[1]
      if (!url) return false

      const image = new Image()
      image.src = url
      await image.decode()
      return true
    },
    {},
    selector,
  )

  await waitForBrowserSettled()
}

export default waitForBackgroundImage
