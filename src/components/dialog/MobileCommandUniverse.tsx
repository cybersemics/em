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
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useBreakpoint from '../../hooks/useBreakpoint'
import useCommandUniverseSelection from '../../hooks/useCommandUniverseSelection'
import commandUniverseSearchSortStore from '../../stores/commandUniverseSearchSortStore'
import durations from '../../util/durations'
import CommandUniverseHeader from '../CommandUniverse/CommandUniverseHeader'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import CommandUniverseList from '../CommandUniverseList'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import Kbd from '../Kbd'
import ScaleFadeTransition from '../ScaleFadeTransition'
import Dialog from './Dialog'
import DialogGlass from './DialogGlass'

/** Displays the keyboard controls for moving through the list and between pages. */
const CommandUniverseFooter = () => (
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
      <Kbd size={21} isText>
        Tab
      </Kbd>
    </div>
  </div>
)

/** Composes the responsive dialog, with ministore-owned search and sorting and Redux-owned navigation. */
const CommandUniverseSession = ({
  isOpen,
  animation,
}: {
  isOpen: boolean
  animation: ComponentProps<typeof Dialog>['animation']
}) => {
  const dispatch = useDispatch()
  const isDesktop = useBreakpoint('lg')
  const restoreSelection = useCommandUniverseSelection({ enabled: isDesktop })
  const nodeRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<ComponentRef<typeof CommandUniverseList>>(null)
  const nav = useSelector(state => state.commandUniverseNavigation)
  const { search, sortOrder } = commandUniverseSearchSortStore.useState()
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
    <Dialog animation={animation} onClose={onClose} nodeRef={nodeRef}>
      <DialogGlass>
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
                  onInput={value => commandUniverseSearchSortStore.update({ search: value })}
                  autoFocus={isOpen}
                  onKeyDown={event => listRef.current?.handleKeyDown(event)}
                />
                <CommandUniverseSortButton
                  sortOrder={sortOrder}
                  onSortChange={value => {
                    commandUniverseSearchSortStore.update({ sortOrder: value })
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
        <div className={css({ height: 'min(70vh, 70dvh)', minHeight: 0, lg: { height: 'min(70dvh, 480px)' } })}>
          <CommandUniversePageRouter listRef={listRef} onBeforeExecute={restoreSelection} />
        </div>
      </DialogGlass>
      {isDesktop && <CommandUniverseFooter />}
    </Dialog>
  )
}

/** Mounts one browsing session for each opening and owns its shared fade/scale lifecycle. */
const MobileCommandUniverse = () => {
  const isOpen = useSelector(state => !!state.showMobileCommandUniverse)
  const rootEntryId = useSelector(state => state.commandUniverseNavigation.entries[0].entryId)
  const isDesktop = useBreakpoint('lg')
  return (
    <ScaleFadeTransition in={isOpen} duration={durations.get(isDesktop ? 'fast' : 'medium') / 1000}>
      {({ isPresent, opacity, scale }) => (
        <CommandUniverseSession key={rootEntryId} isOpen={isPresent} animation={{ opacity, scale }} />
      )}
    </ScaleFadeTransition>
  )
}

export default MobileCommandUniverse
