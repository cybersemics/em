import { animate, motion, useMotionValue } from 'motion/react'
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
import CommandId from '../../@types/CommandId'
import { commandUniverseBackActionCreator as commandUniverseBack } from '../../actions/commandUniverseBack'
import { commandUniverseForwardActionCreator as commandUniverseForward } from '../../actions/commandUniverseForward'
import { commandUniverseSearchActionCreator } from '../../actions/commandUniverseSearch'
import { commandUniverseSortActionCreator } from '../../actions/commandUniverseSort'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import { hashCommand, hashKeyDown } from '../../commands'
import { commandById } from '../../commands'
import openMobileCommandUniverse from '../../commands/openMobileCommandUniverse'
import useBreakpoint from '../../hooks/useBreakpoint'
import useCommandUniverseSelection from '../../hooks/useCommandUniverseSelection'
import isCommandExecutable from '../../selectors/isCommandExecutable'
import durations from '../../util/durations'
import CommandUniverseHeader from '../CommandUniverse/CommandUniverseHeader'
import CommandUniversePageRouter from '../CommandUniverse/CommandUniversePageRouter'
import commandUniverseMotion from '../CommandUniverse/commandUniverseMotion'
import CommandUniverseList from '../CommandUniverseList'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import FadeScaleTransition from '../FadeScaleTransition'
import Kbd from '../Kbd'
import Dialog from './Dialog'
import DialogGlass from './DialogGlass'

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

/** Illuminates the focused row as a sibling of the clipped glass and zooming pages. */
const SelectionGlow = ({
  row,
  positionerRef,
  isActive,
}: {
  row: HTMLLIElement | null
  positionerRef: React.RefObject<HTMLDivElement | null>
  isActive: boolean
}) => {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [rightFade, setRightFade] = useState({ start: 0, end: 0 })
  const commandId = row?.getAttribute('data-cu-command-id') as CommandId | undefined
  const disabled = useSelector(state => (commandId ? !isCommandExecutable(state, commandById(commandId)) : false))

  useEffect(() => {
    const box = positionerRef.current
    if (!row || !box) return
    const scroller = row.closest<HTMLElement>('[data-dialog-scroll="true"]')
    if (!scroller) return
    const position = { left: 0, top: 0 }
    /** Reads row layout after selection or resizing, rather than on each animation frame. */
    const measure = () => {
      const offsets = { left: 0, top: row.offsetHeight / 2 }
      for (
        let element: HTMLElement | null = row;
        element && element !== box;
        element = element.offsetParent as HTMLElement | null
      ) {
        offsets.left += element.offsetLeft
        offsets.top += element.offsetTop
      }
      position.left = offsets.left
      position.top = offsets.top
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const end = box.offsetWidth - offsets.left + 3.3 * rem + 62
      setRightFade({ start: end - 63, end })
      x.set(position.left + 240 - scroller.scrollLeft)
      void animate(y, position.top - scroller.scrollTop, { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] })
    }
    /** Tracks scrolling from cached row layout; scroll offsets do not require reading row geometry again. */
    const onScroll = () => {
      x.set(position.left + 240 - scroller.scrollLeft)
      y.jump(position.top - scroller.scrollTop)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(row)
    scroller.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', onScroll)
      x.stop()
      y.stop()
    }
  }, [positionerRef, row, x, y])

  const mask = `linear-gradient(to right, transparent 0%, black 8%, black ${rightFade.start}px, transparent ${rightFade.end}px)`
  return (
    <div
      aria-hidden
      className={css({
        position: 'absolute',
        top: 0,
        bottom: '-24px',
        left: '-240px',
        right: '-62px',
        overflow: 'clip',
        borderRadius: '0 32px 32px 0',
        pointerEvents: 'none',
      })}
    >
      <motion.img
        src='/img/dialog/dialog-selection.avif'
        alt=''
        draggable={false}
        initial={false}
        animate={{ opacity: isActive && row ? (disabled ? 0.5 : 1) : 0, scale: isActive ? 1 : 1.2 }}
        transition={{ opacity: { duration: isActive ? 0.2 : 0.22 }, scale: commandUniverseMotion }}
        className={css({
          position: 'absolute',
          top: '-0.2rem',
          left: '-3.3rem',
          width: 'auto',
          height: '13.8rem',
          maxWidth: 'none',
          pointerEvents: 'none',
          userSelect: 'none',
          mixBlendMode: 'screen',
          filter: disabled ? 'grayscale(0.5)' : 'none',
          transformOrigin: '10% 50%',
          zIndex: 10,
          willChange: 'transform',
        })}
        style={{ x, y, translateY: '-50%', maskImage: mask, WebkitMaskImage: mask }}
      />
    </div>
  )
}

/** Composes the responsive dialog, while Redux owns browsing and navigation. */
const CommandUniverseSession = ({
  isOpen,
  animation,
}: {
  isOpen: boolean
  animation: ComponentProps<typeof Dialog>['animation']
}) => {
  const dispatch = useDispatch()
  const [focusedRow, setFocusedRow] = useState<HTMLLIElement | null>(null)
  const glassPositionerRef = useRef<HTMLDivElement>(null)
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
      if (event.key === 'Escape' || hashKeyDown(event) === hashCommand(openMobileCommandUniverse.keyboard)) {
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
      <div
        ref={glassPositionerRef}
        data-cu-glass-positioner='true'
        className={css({ position: 'relative', width: '100%' })}
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
            <CommandUniversePageRouter
              listRef={listRef}
              onFocusedRowChange={setFocusedRow}
              onBeforeExecute={restoreSelection}
            />
          </div>
        </DialogGlass>
        {isDesktop && (
          <SelectionGlow row={focusedRow} positionerRef={glassPositionerRef} isActive={isOpen && isCommandsPage} />
        )}
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
