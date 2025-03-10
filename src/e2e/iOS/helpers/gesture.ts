import { Browser, TouchAction } from 'webdriverio'
import Direction from '../../../@types/Direction'
import GesturePath from '../../../@types/GesturePath'

export interface GestureOptions {
  xStart?: number
  yStart?: number
  segmentLength?: number
  waitMs?: number
}

/** Apply gesture action for the given path. */
const gesture = async (
  browser: Browser,
  path: GesturePath,
  { xStart, yStart, segmentLength = 60, waitMs = 0 }: GestureOptions = {},
) => {
  if (!xStart || !yStart) {
    const windowSize = await browser.getWindowSize()
    xStart = xStart ?? windowSize!.width / 3
    yStart = yStart ?? windowSize!.height / 2
  }

  const actions = browser.action('pointer').move({ x: xStart, y: yStart }).down().pause(waitMs)

  // 'wait' action is used for the speed of the moveTo action. Appium needs wait action before 'move' actions. If we don't add 'wait' actions none of the touch event is triggered.
  const WAIT_ACTION = { action: 'wait', ms: waitMs } as TouchAction

  ;(Array.from(path) as Direction[]).reduce<TouchAction[]>((acc, cur) => {
    const { x: previousX, y: previousY } = acc.length > 0 ? acc[acc.length - 1] : { x: xStart, y: yStart }
    const x = previousX! + (cur === 'r' ? +segmentLength : cur === 'l' ? -segmentLength : 0)
    const y = previousY! + (cur === 'd' ? +segmentLength : cur === 'u' ? -segmentLength : 0)

    actions.move({ x, y }).pause(waitMs)
    return [...acc, WAIT_ACTION, { action: 'moveTo', x, y }]
  }, [])

  await actions.up().perform()
}

export default gesture
