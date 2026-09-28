import type { TouchEventRecord } from './recordTouchEvents'

/** Reads the touch events recorded since recordTouchEvents. */
const readTouchEvents = (): Promise<TouchEventRecord[]> =>
  browser.execute(() => (window as unknown as { __touchEvents?: TouchEventRecord[] }).__touchEvents ?? null) as Promise<
    TouchEventRecord[]
  >

/**
 * Waits until the page has received the given number of touches since recordTouchEvents, and a touchend or touchcancel
 * for each of them. An end that arrives before the first recorded touchstart belongs to an earlier touch and is not
 * counted. Call it after the fingers have lifted. Throws with the recorded timeline if a touch is missing or still open
 * when the timeout elapses.
 */
const waitForTouchesToEnd = async (touches: number, { timeout = 3000 }: { timeout?: number } = {}) => {
  const recorded = await readTouchEvents()
  if (!recorded) throw new Error('No touch events are being recorded. Call recordTouchEvents first.')

  try {
    await browser.waitUntil(
      () =>
        browser.execute(touches => {
          const record = (window as unknown as { __touchEvents: TouchEventRecord[] }).__touchEvents
          const firstStart = record.findIndex(event => event.type === 'touchstart')
          if (firstStart === -1) return false
          const starts = record.slice(firstStart).filter(event => event.type === 'touchstart').length
          const ends = record.slice(firstStart).filter(event => event.type !== 'touchstart').length
          return starts === touches && ends === touches
        }, touches),
      { timeout },
    )
  } catch {
    const record = await readTouchEvents()
    const start = record[0]?.receivedAt ?? 0
    const timeline = record
      .map(
        event =>
          `  ${event.type.padEnd(11)} received +${Math.round(event.receivedAt - start)}ms, timeStamp +${Math.round(event.timeStamp - start)}ms`,
      )
      .join('\n')
    const starts = record.filter(event => event.type === 'touchstart').length
    const ends = record.length - starts
    throw new Error(
      `Expected ${touches} ${touches === 1 ? 'touch' : 'touches'} to have ended within ${timeout}ms, but the page received ${starts} touchstart and ${ends} touchend/touchcancel in all:\n${timeline}`,
    )
  }
}

export default waitForTouchesToEnd
