import gestures from '../../../test-helpers/gestures.js'
import editThought from './editThought.js'
import gesture from './gesture.js'
import waitForEditable from './waitForEditable.js'

interface Options {
  insertNewSubthought?: boolean
}

/**
 * Creates a new thought by gesture and typing text.
 * Uses the global browser object from WDIO.
 */
const newThought = async (value?: string, { insertNewSubthought }: Options = {}) => {
  await gesture(insertNewSubthought ? gestures.newSubThought : gestures.newThought)
  await waitForEditable('')
  if (value) {
    await editThought(value)
  }
}

export default newThought
