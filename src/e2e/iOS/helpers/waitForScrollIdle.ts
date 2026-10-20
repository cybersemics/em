import waitUntil from './waitUntil.js'

/** Wait until the document stops scrolling, e.g. after a smooth scroll to the cursor or after the keyboard opens. */
const waitForScrollIdle = async (): Promise<void> => {
  let lastScrollY: number | undefined
  await waitUntil(async () => {
    const scrollY = await browser.execute(() => window.scrollY)
    const idle = scrollY === lastScrollY
    lastScrollY = scrollY
    return idle
  })
}

export default waitForScrollIdle
