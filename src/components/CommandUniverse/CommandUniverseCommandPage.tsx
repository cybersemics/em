import { motion } from 'motion/react'
import React, { useMemo } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { css } from '../../../styled-system/css'
import Command from '../../@types/Command'
import CommandSortType from '../../@types/CommandSortType'
import { alertActionCreator as alert } from '../../actions/alert'
import { commandUniverseBackActionCreator as commandUniverseBack } from '../../actions/commandUniverseBack'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { commandUniverseSearchActionCreator } from '../../actions/commandUniverseSearch'
import { commandUniverseSortActionCreator } from '../../actions/commandUniverseSort'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import { executeCommandWithMulticursor } from '../../commands'
import useBreakpoint from '../../hooks/useBreakpoint'
import useCommandList from '../../hooks/useCommandList'
import isCommandExecutable from '../../selectors/isCommandExecutable'
import storageModel from '../../stores/storageModel'
import durations from '../../util/durations'
import CommandUniverseGrid from '../CommandUniverseGrid'
import CommandUniverseList from '../CommandUniverseList'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import DialogContent from '../dialog/DialogContent'
import useRearrangeAnimation from './useRearrangeAnimation'

/** The message shown in the middle of the dialog, in place of the grid, when a search matches no commands. */
const NoResultsMessage = () => (
  <motion.div
    role='status'
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    transition={{ duration: durations.get('medium') / 1000, ease: 'easeOut' }}
    className={css({
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      // Same additive blend as the search row, so the message reads as part of the glass.
      mixBlendMode: 'plus-lighter',
      color: 'dialogSearchAccent',
    })}
  >
    <span className={css({ fontSize: '1.1em' })}>No results</span>
  </motion.div>
)

/**
 * The command collection page, presented as a mobile grid or desktop list. Split out so that useCommandList only runs
 * while the dialog is open. If it ran always, useFilteredCommands inside the hook would
 * remain subscribed to gestureStore, and this would trigger unnecessary re-renders when
 * gestures are inputted.
 */
const CommandUniverseCommandPageComponent = ({
  listRef,
  onFocusedRowChange,
  onBeforeExecute,
}: {
  listRef?: React.RefObject<React.ComponentRef<typeof CommandUniverseList> | null>
  onFocusedRowChange?: (row: HTMLLIElement | null) => void
  onBeforeExecute?: () => void
}) => {
  const dispatch = useDispatch()
  const commandStore = useStore()
  const isDesktop = useBreakpoint('md')
  const search = useSelector(state => state.commandUniverseBrowsing.search)
  const sortOrder = useSelector(state => state.commandUniverseBrowsing.sortOrder)
  const { sections } = useCommandList({ search: search.trim(), sortOrder, sortActiveCommandsFirst: true })

  // A search with no matches shows a message in place of an empty "Results" header in the grid. Dropping the empty section lets the header fade out with the rest of the rearrangement. Memoized because the grid's sections are the rearrangement's layout key.
  const gridSections = useMemo(
    () => (sections.every(section => section.commands.length === 0) ? [] : sections),
    [sections],
  )
  const noResults = gridSections.length === 0

  /** Executes through the shared command pipeline after validating current editor state. */
  const activate = (command: Command) => {
    dispatch((dispatch, getState) => {
      if (!isCommandExecutable(getState(), command)) {
        dispatch(alert(`${command.label} isn't available right now`))
        return
      }
      onBeforeExecute?.()
      dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
      executeCommandWithMulticursor(command, { store: commandStore, type: 'commandUniverse' })
      const recent = storageModel.get('recentCommands')
      storageModel.set('recentCommands', [command.id, ...recent.filter(id => id !== command.id)].slice(0, 5))
    })
  }

  // Pass this ref to `DialogContent`, which owns the scrollable element, so that we can reset
  // the scroll position to the top as the results rearrange.
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Fills the page surface, so zoom origins measured against it match the surface's transform origin.
  const pageRef = React.useRef<HTMLDivElement>(null)

  const ghostLayerRef = React.useRef<HTMLDivElement>(null)

  const captureLayout = useRearrangeAnimation({ scrollRef, ghostLayerRef, layoutKey: gridSections })

  return (
    <div
      ref={pageRef}
      className={css({ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 })}
    >
      {/* Search row that lives between the header and the scrollable content. Sits outside the scroll
          container so it stays put as the command list scrolls. Left padding matches contentInner so the
          search glyph aligns with the section headers and command list down the left edge of the panel. */}
      {!isDesktop && (
        <div
          className={css({
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            paddingInline: '1rem',
            paddingBlock: '0.5rem',
            md: { display: 'none' },
          })}
        >
          <CommandUniverseSearch
            value={search}
            onInput={(value: string) => {
              captureLayout()
              dispatch(commandUniverseSearchActionCreator(value))
            }}
          />
          <CommandUniverseSortButton
            sortOrder={sortOrder}
            onSortChange={(value: CommandSortType) => {
              captureLayout()
              dispatch(commandUniverseSortActionCreator(value))
            }}
          />
        </div>
      )}

      <DialogContent scrollRef={scrollRef}>
        {isDesktop ? (
          sections.every(section => section.commands.length === 0) ? (
            <div role='status'>No matching commands</div>
          ) : (
            <CommandUniverseList
              ref={listRef}
              onFocusedRowChange={onFocusedRowChange}
              groups={sections}
              search={search}
              onItemTap={(command, origin) => dispatch(commandUniverseNavigate('detail', { command }, { origin }))}
              onItemActivate={activate}
              onNavigateBack={() => dispatch(commandUniverseBack())}
            />
          )
        ) : (
          <CommandUniverseGrid sections={gridSections} search={search} scrollRootRef={scrollRef} pageRef={pageRef} />
        )}
      </DialogContent>

      {!isDesktop && noResults && <NoResultsMessage />}

      {/* Holds the ghosts of the cells that leave the view during a rearrangement while they animate out. */}
      <div ref={ghostLayerRef} className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })} />
    </div>
  )
}

const CommandUniverseCommandPage = React.memo(CommandUniverseCommandPageComponent)
CommandUniverseCommandPage.displayName = 'CommandUniverseCommandPage'

export default CommandUniverseCommandPage
