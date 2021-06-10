import { Direction } from '../../../../types'
import { Browser, TouchAction } from 'webdriverio'

export interface GestureOptions {
  xStart?: number,
  yStart?: number,
  segmentLength?: number,
}

// Appium needs wait action before 'move' actions. If we don't add 'wait' actions none of the touch event is triggered.
const WAIT_ACTION = { action: 'wait', ms: 50 } as TouchAction

/** Apply gesture action for the given path. */
const gesture = async (browser: Browser<'async'>, path: Direction[], { xStart = 70, yStart = 300, segmentLength = 70 }: GestureOptions = {}) => {

  const moveActions = path.reduce<TouchAction[]>((acc, cur) => {
    const { x: previousX, y: previousY } = acc.length > 0
      ? acc[acc.length - 1]
      : { x: xStart, y: yStart }
    const x = previousX! + (cur === 'r' ? +segmentLength : cur === 'l' ? -segmentLength : 0)
    const y = previousY! + (cur === 'd' ? +segmentLength : cur === 'u' ? -segmentLength : 0)
    return [...acc, WAIT_ACTION, { action: 'moveTo', x, y }]
  }, [])

  // add first and last action
  const actions = [
    { action: 'press', x: xStart, y: yStart },
    ...moveActions,
    { action: 'release' }
  ] as TouchAction[]

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await browser.touchAction(actions)
}

export default gesture
