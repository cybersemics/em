import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleGestureCheatsheetActionCreator } from '../../actions/toggleGestureCheatsheet'
import CommandTable from '../CommandTable'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Gesture cheatsheet component.
 */
const GestureCheatsheet: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showGestureCheatsheet)
  const nodeRef = React.useRef<HTMLDivElement>(null)

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    dispatch(toggleGestureCheatsheetActionCreator({ value: false }))
  }

  return (
    <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
      <Dialog onClose={handleClose} nodeRef={nodeRef}>
        <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
        <DialogContent>
          <CommandTable viewType='grid' />
        </DialogContent>
      </Dialog>
    </FadeTransition>
  )
}

export default GestureCheatsheet
