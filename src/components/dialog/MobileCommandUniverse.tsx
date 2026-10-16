import { ComponentProps, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { commandUniverseBackActionCreator as commandUniverseBack } from '../../actions/commandUniverseBack'
import { commandUniverseForwardActionCreator as commandUniverseForward } from '../../actions/commandUniverseForward'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useBreakpoint from '../../hooks/useBreakpoint'
import durations from '../../util/durations'
import CommandUniverseHeader from '../CommandUniverse/CommandUniverseHeader'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import FadeScaleTransition from '../FadeScaleTransition'
import Dialog from './Dialog'

/** Preloads the decorative dialog images before the user opens Commands. */
const HiddenDialogAssets = () => (
  <>
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)', visibility: 'hidden' })} />
  </>
)

/** Composes the Commands dialog without owning history or animation mechanics. */
const CommandUniverseDialog = ({ animation }: { animation: ComponentProps<typeof Dialog>['animation'] }) => {
  const dispatch = useDispatch()
  const nodeRef = useRef<HTMLDivElement>(null)
  const { entries, index } = useSelector(state => state.commandUniverseNavigation)
  const onClose = useCallback(() => {
    dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
  }, [dispatch])
  const onBack = useCallback(() => dispatch(commandUniverseBack()), [dispatch])
  const onForward = useCallback(() => dispatch(commandUniverseForward()), [dispatch])

  return (
    <>
      <HiddenDialogAssets />
      <Dialog animation={animation} onClose={onClose} nodeRef={nodeRef}>
        <CommandUniverseHeader
          onClose={onClose}
          onBack={onBack}
          onForward={onForward}
          canGoBack={index > 0}
          canGoForward={index < entries.length - 1}
        >
          Commands
        </CommandUniverseHeader>
        <div className={css({ height: 'min(70vh, 70dvh)', minHeight: 0 })}>
          <CommandUniversePageRouter />
        </div>
      </Dialog>
    </>
  )
}

/** Renders the mobile Command Universe from its Redux-owned navigation session. */
const MobileCommandUniverse = () => {
  const isOpen = useSelector(state => !!state.showMobileCommandUniverse)
  const isDesktop = useBreakpoint('md')
  return (
    <FadeScaleTransition
      in={isOpen}
      duration={durations.get(isDesktop ? 'fast' : 'medium') / 1000}
      scaleFrom={isDesktop ? 0.95 : 1}
    >
      {({ opacity, scale }) => <CommandUniverseDialog animation={{ opacity, scale }} />}
    </FadeScaleTransition>
  )
}

export default MobileCommandUniverse
