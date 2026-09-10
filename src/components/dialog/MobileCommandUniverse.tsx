import { useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import CommandUniverseProvider from '../CommandUniverse/CommandUniverseProvider'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogHeader from './DialogHeader'

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

/** Composes the Commands dialog without owning history mechanics. */
const CommandUniverseDialog = ({ isOpen }: { isOpen: boolean }) => {
  const dispatch = useDispatch()
  const nodeRef = useRef<HTMLDivElement>(null)
  const onClose = useCallback(() => {
    dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
  }, [dispatch])

  return (
    <>
      <HiddenDialogAssets />
      <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
        <Dialog onClose={onClose} nodeRef={nodeRef}>
          <DialogHeader onClose={onClose}>Commands</DialogHeader>
          <CommandUniversePageRouter />
        </Dialog>
      </FadeTransition>
    </>
  )
}

/** Keeps the session owner outside its presentation so alternative shells can share the same navigator. */
const MobileCommandUniverse = () => {
  const isOpen = useSelector(state => !!state.showMobileCommandUniverse)
  return (
    <CommandUniverseProvider isOpen={isOpen}>
      <CommandUniverseDialog isOpen={isOpen} />
    </CommandUniverseProvider>
  )
}

export default MobileCommandUniverse
