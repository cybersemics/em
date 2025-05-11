import Command from '../@types/Command'
import { selectBetweenActionCreator } from '../actions/selectBetween'

const selectBetweenCommand: Command = {
  id: 'selectBetween',
  label: 'Select Between',
  description: 'Selects all thoughts between two selected thoughts.',
  gesture: 'rdl',
  multicursor: false,
  exec: dispatch => {
    dispatch(selectBetweenActionCreator())
  },
}

export default selectBetweenCommand
