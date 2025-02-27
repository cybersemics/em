import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { closeDialogActionCreator } from '../../actions/closeDialog'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'
import CommandTable from '../CommandTable'
import { css } from '../../../styled-system/css'

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
          <DialogContent>
            <div
              className={css({
                maxHeight: '50vh',
                overflowY: 'auto',
                padding: '1rem',
              })}
            >
              <CommandTable />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default GestureCheatsheet
