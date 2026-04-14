import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import CommandTable from '../CommandTable'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Mobile Command Universe component.
 */
const MobileCommandUniverse: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showMobileCommandUniverse)
  const nodeRef = React.useRef<HTMLDivElement>(null)

  /**
   * Handles the closure of the mobile command universe.
   */
  const handleClose = () => {
    dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
  }

  return (
    <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
      <Dialog onClose={handleClose} nodeRef={nodeRef}>
        <DialogTitle onClose={handleClose}>Command Universe</DialogTitle>
        <DialogContent>
          <CommandTable viewType='grid' />
        </DialogContent>
      </Dialog>
    </FadeTransition>
  )
}

export default MobileCommandUniverse
