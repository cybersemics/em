import newSubthoughtCommand from '../../../commands/newSubthought.js'
import newThoughtCommand from '../../../commands/newThought.js'
import editThought from './editThought.js'
import gesture from './gesture.js'
import waitForEditable from './waitForEditable.js'

interface Options {
  insertNewSubthought?: boolean
}

/** Creates a new thought by gesture and typing text. */
const newThought = async (value?: string, { insertNewSubthought }: Options = {}) => {
  await gesture(insertNewSubthought ? newSubthoughtCommand : newThoughtCommand)
  await waitForEditable('')
  if (value) {
    await editThought(value)
  }
}

export default newThought
