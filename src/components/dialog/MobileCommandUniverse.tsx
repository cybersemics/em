import {
  ComponentProps,
  ComponentRef,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { commandUniverseBackActionCreator as commandUniverseBack } from '../../actions/commandUniverseBack'
import { commandUniverseForwardActionCreator as commandUniverseForward } from '../../actions/commandUniverseForward'
import { commandUniverseSearchActionCreator } from '../../actions/commandUniverseSearch'
import { commandUniverseSortActionCreator } from '../../actions/commandUniverseSort'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useBreakpoint from '../../hooks/useBreakpoint'
import useCommandUniverseSelection from '../../hooks/useCommandUniverseSelection'
import durations from '../../util/durations'
import CommandUniverseHeader from '../CommandUniverse/CommandUniverseHeader'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import CommandUniverseList from '../CommandUniverseList'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import FadeScaleTransition from '../FadeScaleTransition'
import Kbd from '../Kbd'
import Dialog from './Dialog'

/** Preloads the decorative dialog images before the user opens Commands. */
const HiddenDialogAssets = () => (
  <>
    <div
      aria-hidden
      className={css({ backgroundImage: 'url(/img/dialog/dialog-search-background.avif)', visibility: 'hidden' })}
    />
    <div
      aria-hidden
      className={css({ backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)', visibility: 'hidden' })}
    />
    <div
      aria-hidden
      className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight.avif)', visibility: 'hidden' })}
    />
    <div
      aria-hidden
      className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)', visibility: 'hidden' })}
    />
  </>
)

/** Displays the current history level and its navigation controls. */
const CommandUniverseFooter = ({
  isCommandsPage,
  canGoForward,
  onBack,
  onForward,
}: {
  isCommandsPage: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
}) => (
  <div
    className={css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: 'fgOverlay50',
      paddingTop: '0.75rem',
      paddingInline: '1.9rem',
      fontSize: '0.85em',
      fontFamily: 'radioCanada',
    })}
  >
    <div className={css({ display: 'flex', alignItems: 'center', gap: '4px' })}>
      <Kbd size={21}>↑</Kbd>
      <Kbd size={21}>↓</Kbd>
      <span className={css({ marginLeft: '6px', fontSize: '0.9em' })}>Navigate</span>
    </div>
    <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
      <div className={css({ display: 'flex', gap: '2px' })}>
        <Kbd size={21}>⇧</Kbd>
        <Kbd size={21} isText>
          Tab
        </Kbd>
      </div>
      <span
        aria-hidden
        className={css({
          width: '6.4px',
          height: '6.4px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.3)',
        })}
      />
      <span
        aria-hidden
        className={css({
          width: '6.4px',
          height: '6.4px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.3)',
        })}
      />
      <button
        type='button'
        aria-label='Commands index'
        onClick={onBack}
        aria-disabled={isCommandsPage}
        className={css({
          width: '10.4px',
          height: '10.4px',
          padding: 0,
          borderRadius: '50%',
          background: 'transparent',
          border: isCommandsPage ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.3)',
        })}
      />
      <button
        type='button'
        aria-label='Command detail'
        onClick={() => {
          if (isCommandsPage && canGoForward) onForward()
        }}
        aria-disabled={!isCommandsPage || !canGoForward}
        className={css({
          width: '6.4px',
          height: '6.4px',
          padding: 0,
          borderRadius: '50%',
          background: 'transparent',
          border: !isCommandsPage ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.3)',
        })}
      />
      <Kbd size={21} isText>
        Tab
      </Kbd>
    </div>
  </div>
)

/** Composes the responsive dialog, while Redux owns browsing and navigation. */
const CommandUniverseSession = ({
  isOpen,
  animation,
}: {
  isOpen: boolean
  animation: ComponentProps<typeof Dialog>['animation']
}) => {
  const dispatch = useDispatch()
  const isDesktop = useBreakpoint('md')
  const restoreSelection = useCommandUniverseSelection({ enabled: isDesktop })
  const nodeRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<ComponentRef<typeof CommandUniverseList>>(null)
  const nav = useSelector(state => state.commandUniverseNavigation)
  const search = useSelector(state => state.commandUniverseBrowsing.search)
  const sortOrder = useSelector(state => state.commandUniverseBrowsing.sortOrder)
  const isCommandsPage = nav.entries[nav.index].page.pageId === 'commands'
  const onClose = useCallback(() => {
    dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
  }, [dispatch])
  const onBack = useCallback(() => dispatch(commandUniverseBack()), [dispatch])
  const onForward = useCallback(() => dispatch(commandUniverseForward()), [dispatch])

  useEffect(() => {
    if (!isOpen) return
    /** Routes dialog keys without changing ordinary search text editing. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
      } else if (isDesktop && isCommandsPage && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) {
        const input = nodeRef.current?.querySelector<HTMLInputElement>('input[aria-label="Search for a command"]')
        if (!input || event.target === input) return
        input.focus({ preventScroll: true })
        listRef.current?.handleKeyDown({
          key: event.key,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          nativeEvent: event,
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopImmediatePropagation(),
        } as unknown as ReactKeyboardEvent)
      } else if (isDesktop && event.key === 'Tab' && !isCommandsPage) {
        if ((event.target as HTMLElement | null)?.matches('input, textarea, [contenteditable="true"]')) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (event.shiftKey) onBack()
        else onForward()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [dispatch, isCommandsPage, isDesktop, isOpen, onBack, onClose, onForward])

  return (
    <Dialog
      animation={animation}
      onClose={onClose}
      nodeRef={nodeRef}
      footer={
        isDesktop ? (
          <CommandUniverseFooter
            isCommandsPage={isCommandsPage}
            canGoForward={nav.index < nav.entries.length - 1}
            onBack={onBack}
            onForward={onForward}
          />
        ) : undefined
      }
    >
      <CommandUniverseHeader
        onClose={onClose}
        onBack={onBack}
        onForward={onForward}
        canGoBack={nav.index > 0}
        canGoForward={nav.index < nav.entries.length - 1}
        searchControls={
          isDesktop && isCommandsPage ? (
            <>
              <CommandUniverseSearch
                value={search}
                onInput={value => dispatch(commandUniverseSearchActionCreator(value))}
                autoFocus={isOpen}
                onKeyDown={event => listRef.current?.handleKeyDown(event)}
              />
              <CommandUniverseSortButton
                sortOrder={sortOrder}
                onSortChange={value => {
                  dispatch(commandUniverseSortActionCreator(value))
                  nodeRef.current
                    ?.querySelector<HTMLInputElement>('input[aria-label="Search for a command"]')
                    ?.focus({ preventScroll: true })
                }}
              />
            </>
          ) : undefined
        }
      >
        Commands
      </CommandUniverseHeader>
      <div className={css({ height: 'min(70vh, 70dvh)', minHeight: 0, md: { height: 'min(70dvh, 480px)' } })}>
        <CommandUniversePageRouter listRef={listRef} onBeforeExecute={restoreSelection} />
      </div>
    </Dialog>
  )
}

/** Mounts one browsing session for each opening and owns its shared fade/scale lifecycle. */
const MobileCommandUniverse = () => {
  const isOpen = useSelector(state => !!state.showMobileCommandUniverse)
  const rootEntryId = useSelector(state => state.commandUniverseNavigation.entries[0].entryId)
  const isDesktop = useBreakpoint('md')
  return (
    <>
      <HiddenDialogAssets />
      <FadeScaleTransition
        in={isOpen}
        duration={durations.get(isDesktop ? 'fast' : 'medium') / 1000}
        scaleFrom={isDesktop ? 0.95 : 1}
      >
        {({ isPresent, opacity, scale }) => (
          <CommandUniverseSession key={rootEntryId} isOpen={isPresent} animation={{ opacity, scale }} />
        )}
      </FadeScaleTransition>
    </>
  )
}

export default MobileCommandUniverse
