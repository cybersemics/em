import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import CommandTable from '../CommandTable'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Pre-rendered hidden divs that force the browser to fetch the dialog's decorative AVIFs ahead of time, so they are cached when the dialog opens. Same workaround pattern used by CommandCenter's HiddenOverlay. Always mounted because the parent is rendered at the AppComponent level.
 */
const HiddenDialogAssets = () => (
  <>
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)', visibility: 'hidden' })} />
  </>
)

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
    <>
      <HiddenDialogAssets />
      <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
        <Dialog onClose={handleClose} nodeRef={nodeRef}>
          <DialogTitle onClose={handleClose}>Command Universe</DialogTitle>
          <DialogContent>
            <CommandTable viewType='grid' />
          </DialogContent>
        </Dialog>
      </FadeTransition>
    </>
  )
}

export default MobileCommandUniverse
