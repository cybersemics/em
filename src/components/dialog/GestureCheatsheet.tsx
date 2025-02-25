import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { closeDialogActionCreator } from '../../actions/closeDialog'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Gesture cheatsheet component.
 */
const GestureCheatsheet: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.dialogOpen)

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    dispatch(closeDialogActionCreator())
  }

  return (
    <>
      {isOpen && (
        <Dialog onClose={handleClose}>
          <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
          <DialogContent>Gesture Cheatsheet content</DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default GestureCheatsheet
