/** Waits for browser layout, paint, and queued macrotasks to settle after DOM-affecting iOS e2e actions. */
const waitForBrowserSettled = async (): Promise<void> => {
  await browser.execute(async () => {
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    await new Promise(resolve => setTimeout(resolve))
  })
}

export default waitForBrowserSettled
