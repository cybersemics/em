import { page } from '../setup'

/** Wait for a transition to finish. */
async function waitForTransitionEnd(selector: string) {
  await page.evaluate(selector => {
    return new Promise<void>(resolve => {
      const transition = document.querySelector(selector)
      if (!transition) throw new Error(`'${selector}' selector not found`)
      transition.addEventListener('transitionend', () => resolve(), { once: true })
    })
  }, selector)
}

export default waitForTransitionEnd
