import { Browser } from 'webdriverio'
import { gestures } from '../../../test-helpers/constants'
import editThought from './editThought'
import gesture from './gesture'
import waitForEditable from './waitForEditable'

interface Options {
  insertNewSubthought?: boolean
}

/** Creates a new thought by gesture and typing text. */
const newThought = async (browser: Browser<'async'>, value?: string, { insertNewSubthought }: Options = {}) => {
  await gesture(browser, insertNewSubthought ? gestures.newSubThought : gestures.newThought)
  await waitForEditable(browser, '')
  if (value) {
    await editThought(browser, value)
  }
}

export default newThought
