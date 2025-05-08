import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleGestureCheatsheetActionCreator } from '../../actions/toggleGestureCheatsheet'
import allowScroll from '../../device/allowScroll'
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

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    dispatch(toggleGestureCheatsheetActionCreator({ value: false }))
  }

  useEffect(() => {
    /** Disable scrolling when the dialog is open. */
    allowScroll(!isOpen)

    return () => {
      allowScroll(true)
    }
  }, [isOpen])

  return (
    <FadeTransition in={isOpen} unmountOnExit duration='medium'>
      <Dialog onClose={handleClose}>
        <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
        <DialogContent>
          <CommandTable viewType='grid' />
        </DialogContent>
      </Dialog>
    </FadeTransition>
  )
}

export default GestureCheatsheet
