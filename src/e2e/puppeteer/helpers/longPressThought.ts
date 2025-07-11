import { ElementHandle } from 'puppeteer'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../../constants'
import sleep from '../../../util/sleep'
import waitForEditable from './waitForEditable'

/** Tap and hold a thought until a long press occurs. */
const longPressThought = async (value: string) => {
  const thought = (await waitForEditable(value)) as ElementHandle
  await thought.touchStart()
  await sleep(TIMEOUT_LONG_PRESS_THOUGHT + 100)
  await thought.touchEnd()
}

export default longPressThought
