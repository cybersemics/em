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
  browser: Browser<'async'>,
  path: GesturePath,
  { xStart, yStart, segmentLength = 60, waitMs = 200 }: GestureOptions = {},
) => {
  if (!xStart || !yStart) {
    const windowSize = await browser.getWindowSize()
    xStart = xStart ?? windowSize!.width / 3
    yStart = yStart ?? windowSize!.height / 2
  }

  // 'wait' action is used for the speed of the moveTo action. Appium needs wait action before 'move' actions. If we don't add 'wait' actions none of the touch event is triggered.
  const WAIT_ACTION = { action: 'wait', ms: waitMs } as TouchAction

  const moveActions = (Array.from(path) as Direction[]).reduce<TouchAction[]>((acc, cur) => {
    const { x: previousX, y: previousY } = acc.length > 0 ? acc[acc.length - 1] : { x: xStart, y: yStart }
    const x = previousX! + (cur === 'r' ? +segmentLength : cur === 'l' ? -segmentLength : 0)
    const y = previousY! + (cur === 'd' ? +segmentLength : cur === 'u' ? -segmentLength : 0)
    return [...acc, WAIT_ACTION, { action: 'moveTo', x, y }]
  }, [])

  // add first and last action
  const actions = [{ action: 'press', x: xStart, y: yStart }, ...moveActions, { action: 'release' }] as TouchAction[]

  // webdriverio has some problem about type for TouchAction[] that is why we add @ts-ignore
  // We didn't use touchPerform here because webdriverio calls touchPerform in the background. https://github.com/webdriverio/webdriverio/blob/aea3d797ab1970309a60c43629f74154453597e9/packages/webdriverio/src/commands/constant.ts#L100
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await browser.touchAction(actions)
}

export default gesture
