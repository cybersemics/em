import { Page } from 'puppeteer'

/** Takes a screenshot. Note: Clears the browser selection first, as the timing of the blinking caret differs between runs. */
const screenshot = async (page: Page) => {
  await page.evaluate(() => {
    // For some reason, in headless mode, removeAllRanges is not enough to remove the caret. It will show up in the screenshot at the beginning of the focusNode.
    // Blurring the active element works as expected (parallels the implementation of selection.clear).
    window.getSelection()?.removeAllRanges()

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })

  return page.screenshot()
}

export default screenshot
