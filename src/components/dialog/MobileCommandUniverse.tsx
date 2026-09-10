import { useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import CommandUniverseProvider from '../CommandUniverse/CommandUniverseProvider'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogHeader from './DialogHeader'

/** Preloads the decorative dialog images before the user opens Commands. */
const HiddenDialogAssets = () => (
  <>
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)', visibility: 'hidden' })} />
  </>
)

/** Composes the Commands dialog without owning history or animation mechanics. */
const CommandUniverseDialog = ({ isOpen }: { isOpen: boolean }) => {
  const dispatch = useDispatch()
  const nodeRef = useRef<HTMLDivElement>(null)
  const navigation = useCommandUniverseNavigator()
  const onClose = useCallback(() => {
    dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
  }, [dispatch])

  return (
    <>
      <HiddenDialogAssets />
      <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
        <Dialog onClose={onClose} nodeRef={nodeRef}>
          <DialogHeader
            onClose={onClose}
            onBack={navigation.back}
            onForward={navigation.forward}
            canGoBack={navigation.canGoBack}
            canGoForward={navigation.canGoForward}
          >
            Commands
          </DialogHeader>
          <div className={css({ height: 'min(70vh, 70dvh)', minHeight: 0 })}>
            <CommandUniversePageRouter />
          </div>
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
