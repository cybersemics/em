import Command from '../@types/Command'
import { swapGrandparentActionCreator } from '../actions/swapGrandparent'
import SwapGrandparentIcon from '../components/icons/SwapGrandparentIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const swapGrandparent = {
  id: 'swapGrandparent',
  label: 'Swap Grandparent' as const,
  description: 'Swap the current thought with its grandparent.',
  gesture: 'ulul',
  multicursor: true,
  svg: SwapGrandparentIcon,
  canExecute: state => {
    return isDocumentEditable() && ((state.cursor?.length ?? 0) >= 3 || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(swapGrandparentActionCreator())
  },
} satisfies Command

export default swapGrandparent
