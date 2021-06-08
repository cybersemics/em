import { Direction } from '../../../../types'
import { Browser } from 'webdriverio'

export interface GestureOptions {
  xStart?: number,
  yStart?: number,
  segmentLength?: number,
}

interface Action<T = any> {
  action: string,
  options?: T,
}

/** Apply gesture action for the given path. */
const gesture = async (browser: Browser<'async'>, path: Direction[], { xStart = 70, yStart = 300, segmentLength = 70 }: GestureOptions = {}) => {

  const moveActions = path.reduce<Action[]>((acc, cur) => {
    const { options: { x: previousX, y: previousY } } = acc.length > 0
      ? acc[acc.length - 1]
      : { options: { x: xStart, y: yStart } }
    const x = previousX + (cur === 'r' ? +segmentLength : cur === 'l' ? -segmentLength : 0)
    const y = previousY + (cur === 'd' ? +segmentLength : cur === 'u' ? -segmentLength : 0)
    return [...acc, { action: 'moveTo', options: { x, y } }]
  }, [])

  // add first and last action
  const actions = [
    { action: 'press', options: { x: xStart, y: yStart } },
    ...moveActions,
    { action: 'release' }
  ]

  await browser.touchPerform(actions)
}

export default gesture
