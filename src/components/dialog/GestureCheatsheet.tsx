import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { closeDialogActionCreator } from '../../actions/closeDialog'
import CommandGrid from '../CommandGrid'
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

  const dialogStyles = css({
    opacity: isOpen ? 1 : 0,
    transition: 'opacity 0.5s ease-in-out',
    maxHeight: '70vh',
    overflow: 'auto',
    padding: '1rem',
    scrollbarColor: '{colors.fg} {colors.bg}',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: '{colors.bg}',
    },
  })

  return (
    <>
      {isOpen && (
        <Dialog onClose={handleClose}>
          <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
          <DialogContent>
            <div className={dialogStyles}>
              <CommandGrid />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default GestureCheatsheet
