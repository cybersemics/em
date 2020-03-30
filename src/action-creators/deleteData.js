// util
import {
  hashThought,
  timestamp,
} from '../util.js'

// db
import { deleteThought, updateLastUpdated } from '../db'

export default ({ value }) => (dispatch, getState) => {

  deleteThought(hashThought(value))
  updateLastUpdated(timestamp())

  dispatch({
    type: 'deleteData',
    value,
  })
}
