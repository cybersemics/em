import Command from '../@types/Command'
import { swapGrandparentActionCreator } from '../actions/swapGrandparent'
import SwapGrandparentIcon from '../components/icons/SwapGrandparentIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import selectedPaths from '../selectors/selectedPaths'
import isDocumentEditable from '../util/isDocumentEditable'

const swapGrandparent = {
  id: 'swapGrandparent',
  label: 'Swap Grandparent' as const,
  description: 'Swap the current thought with its grandparent.',
  gesture: 'ulul',
  multicursor: true,
  svg: SwapGrandparentIcon,
  canExecute: state => {
    // Selected siblings would be swapped with their grandparent one after another, which scrambles the subtree and buries the grandparent, so Swap Grandparent is disabled on them. This also disables Select All + Swap Grandparent whenever there are several siblings (#5874).
    const parentIds = selectedPaths(state).map(path => path[path.length - 2])
    return (
      isDocumentEditable() &&
      ((state.cursor?.length ?? 0) >= 3 || hasMulticursor(state)) &&
      new Set(parentIds).size === parentIds.length
    )
  },
  exec: dispatch => {
    dispatch(swapGrandparentActionCreator())
  },
} satisfies Command

export default swapGrandparent
