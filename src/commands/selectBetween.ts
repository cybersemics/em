import Command from '../@types/Command'
import { selectBetweenActionCreator } from '../actions/selectBetween'
import gestures from './gestures'

const selectBetweenCommand: Command = {
  id: 'selectBetween',
  label: 'Select Between',
  description: 'Selects all thoughts between two selected thoughts.',
  gesture: gestures.SELECT_BETWEEN_GESTURE,
  multicursor: false,
  exec: dispatch => {
    dispatch(selectBetweenActionCreator())
  },
}

export default selectBetweenCommand
