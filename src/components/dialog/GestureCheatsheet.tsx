import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { closeDialogActionCreator } from '../../actions/closeDialog'
import { showDialogActionCreator } from '../../actions/showDialog'
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
   * Handles the open of the gesture cheatsheet.
   */
  const handleOpen = () => {
    dispatch(showDialogActionCreator({ id: 'gestureCheatsheet' }))
  }

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    dispatch(closeDialogActionCreator())
  }

  return (
    <>
      <button onClick={handleOpen}>Open Gesture Cheatsheet</button>
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
