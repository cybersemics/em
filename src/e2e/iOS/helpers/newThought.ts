import gestures from '../../../commands/gestures'
import editThought from './editThought.js'
import gesture from './gesture.js'
import waitForEditable from './waitForEditable.js'

interface Options {
  insertNewSubthought?: boolean
}

/** Creates a new thought by gesture and typing text. */
const newThought = async (value?: string, { insertNewSubthought }: Options = {}) => {
  await gesture(insertNewSubthought ? gestures.NEW_SUBTHOUGHT_GESTURE : gestures.NEW_THOUGHT_GESTURE)
  await waitForEditable('')
  if (value) {
    await editThought(value)
  }
}

export default newThought
