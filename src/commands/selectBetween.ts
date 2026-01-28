import Command from '../@types/Command'
import { selectBetweenActionCreator } from '../actions/selectBetween'

const selectBetweenCommand = {
  id: 'selectBetween',
  label: 'Select Between',
  description: 'Selects all thoughts between two selected thoughts.',
  gesture: 'rdl',
  multicursor: false,
  exec: dispatch => {
    dispatch(selectBetweenActionCreator())
  },
} satisfies Command

export default selectBetweenCommand
