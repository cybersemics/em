import { AnimatePresence, motion } from 'motion/react'
import {
  ComponentProps,
  ComponentRef,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import Command from '../../@types/Command'
import CommandId from '../../@types/CommandId'
import State from '../../@types/State'
import { commandUniverseBackActionCreator as commandUniverseBack } from '../../actions/commandUniverseBack'
import { commandUniverseForwardActionCreator as commandUniverseForward } from '../../actions/commandUniverseForward'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import useBreakpoint from '../../hooks/useBreakpoint'
import useCommandUniverseSelection from '../../hooks/useCommandUniverseSelection'
import commandUniverseSearchSortStore from '../../stores/commandUniverseSearchSortStore'
import durations from '../../util/durations'
import CommandUniverseHeader from '../CommandUniverse/CommandUniverseHeader'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import commandUniverseMotion from '../CommandUniverse/commandUniverseMotion'
import CommandUniverseList from '../CommandUniverseList'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import Kbd from '../Kbd'
import ScaleFadeTransition from '../ScaleFadeTransition'
import Dialog from './Dialog'
import DialogFooter from './DialogFooter'
import DialogGlass from './DialogGlass'

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

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

/** The light for one focused row. Each focused row gets its own, so two exist while the light crossfades from one row to the next. */
const RowGlow = ({ row, isActive }: { row: HTMLLIElement; isActive: boolean }) => {
  const commandId = row.getAttribute('data-cu-command-id') as CommandId | null
  const disabled = useSelector(state => (commandId ? !isExecutable(state, commandById(commandId)) : false))

  return (
    <motion.div
      // Crossfade: fades in when the row gains the focus and out in place once it has moved on. The two fades overlap, so the light crossfades between rows instead of sliding.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ opacity: { duration: durations.get('fast') / 1000, ease: 'easeOut' } }}
      className={css({
        position: 'absolute',
        // Sits on the row's left edge, at its middle. The browser keeps it there as the list scrolls or resizes.
        // When the search filters the row away while its light is still fading out, the fallback moves the light a box height above the clip box, where it is hidden, rather than to the box's corner.
        top: 'anchor(center, -100%)',
        left: 'anchor(left)',
      })}
      style={{ positionAnchor: `--cu-row-${commandId}` }}
    >
      <motion.img
        src='/img/dialog/dialog-selection.avif'
        alt=''
        draggable={false}
        // Active and disabled state, and the zoom away: half strength for a command that cannot run, and fading out while growing when a detail page opens.
        initial={false}
        animate={{ opacity: isActive ? (disabled ? 0.5 : 1) : 0, scale: isActive ? 1 : 1.2 }}
        transition={{
          opacity: { duration: isActive ? 0.2 : 0.22 },
          scale: commandUniverseMotion,
        }}
        className={css({
          position: 'absolute',
          // Tuned by eye: with the -50% translate below, the image's center sits 0.2rem above the row's middle, and its left edge 3.3rem left of the row's, which lines its brightest part up with the row.
          top: '-0.2rem',
          left: '-3.3rem',
          width: 'auto',
          height: '13.8rem', // the glow's size, tuned by eye; its width follows the image's aspect ratio
          maxWidth: 'none',
          pointerEvents: 'none',
          userSelect: 'none',
          filter: disabled ? 'grayscale(0.5)' : 'none',
          transformOrigin: '10% 50%', // grows out from the light source when the glow zooms away
          willChange: 'transform',
          // Fades the image's own left edge, which falls inside the clip box, so it does not end in a hard line.
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%)',
        })}
        style={{ translateY: '-50%' }}
      />
    </motion.div>
  )
}

/** The clip box that holds the light for the focused row. It gives the light room to spill past the glass, carries the screen blend and the soft edge fades, and hosts the crossfade between rows. */
const SelectionGlow = ({ row, isActive }: { row: HTMLLIElement | null; isActive: boolean }) => {
  return (
    <div
      aria-hidden
      className={css({
        // Laid over the glass by the positioner's grid rather than absolutely positioned, so the light's containing block is the positioner, which holds the rows the light is anchored to. The mask below clips the light to this box.
        // Room for the light to spill past the glass: far to the left, a little to the right, and over the footer.
        marginBottom: '-24px',
        marginLeft: '-240px',
        marginRight: '-62px',
        pointerEvents: 'none',
        zIndex: 10,
        // The mask and the blend share this element. On different elements, the mask would isolate the blend from the glass behind it.
        mixBlendMode: 'screen',
        /* Fades the light out over the last 63px on the right and the last 64px at the bottom, so it ends softly instead of at the clip box's edge.
          At the top, it fades in from 12px above the list's scroll viewport to 12px below it, so a row scrolled under the header neither lights the search field nor ends its light in a hard line. The list's top is found from the bottom: the clip box ends 24px below the list, which is min(70dvh, 480px) tall. */
        maskImage:
          'linear-gradient(to right, black calc(100% - 63px), transparent), linear-gradient(to bottom, transparent calc(100% - min(70dvh, 480px) - 36px), black calc(100% - min(70dvh, 480px) - 12px), black calc(100% - 64px), transparent)',
        maskComposite: 'intersect',
        // Without anchor positioning (Safari before 26), the light could not find its row, so there is none.
        '@supports not (anchor-name: --row)': { display: 'none' },
      })}
    >
      <AnimatePresence>
        {row && <RowGlow key={row.getAttribute('data-cu-command-id')} row={row} isActive={isActive} />}
      </AnimatePresence>
    </div>
  )
}

/** Composes the responsive dialog, with ministore-owned search and sorting and Redux-owned navigation. */
const CommandUniverseSession = ({
  isOpen,
  animation,
}: {
  isOpen: boolean
  animation: ComponentProps<typeof Dialog>['animation']
}) => {
  const dispatch = useDispatch()
  const [focusedRow, setFocusedRow] = useState<HTMLLIElement | null>(null)
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
      <div
        data-cu-glass-positioner='true'
        className={css({
          position: 'relative',
          width: '100%',
          // Stacks the glass and the selection glow in one cell.
          display: 'grid',
          '& > *': { gridArea: '1 / 1' },
        })}
      >
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
            <CommandUniversePageRouter
              listRef={listRef}
              onFocusedRowChange={setFocusedRow}
              onBeforeExecute={restoreSelection}
            />
          </div>
        </DialogGlass>
        {isDesktop && <SelectionGlow row={focusedRow} isActive={isOpen && isCommandsPage} />}
      </div>
      {isDesktop && (
        <DialogFooter>
          <CommandUniverseFooter />
        </DialogFooter>
      )}
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
