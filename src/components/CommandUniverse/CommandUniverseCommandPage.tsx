import React from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { SwitchTransition } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import Command from '../../@types/Command'
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
import CommandUniverseGrid from '../CommandUniverseGrid'
import CommandUniverseList from '../CommandUniverseList'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import FadeTransition from '../FadeTransition'
import DialogContent from '../dialog/DialogContent'

/**
 * The command collection page, presented as a mobile grid or desktop list. Split out so that useCommandList only runs
 * while the dialog is open. If it ran always, useFilteredCommands inside the hook would
 * remain subscribed to gestureStore, and this would trigger unnecessary re-renders when
 * gestures are inputted.
 */
const CommandUniverseCommandPageComponent = ({
  listRef,
  onBeforeExecute,
}: {
  listRef?: React.RefObject<React.ComponentRef<typeof CommandUniverseList> | null>
  onBeforeExecute?: () => void
}) => {
  const dispatch = useDispatch()
  const commandStore = useStore()
  const isDesktop = useBreakpoint('md')
  const search = useSelector(state => state.commandUniverseBrowsing.search)
  const sortOrder = useSelector(state => state.commandUniverseBrowsing.sortOrder)
  const { sections } = useCommandList({ search: search.trim(), sortOrder, sortActiveCommandsFirst: true })

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
  // the scroll position to the top as results crossfade.
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // This ref is used to animate a block <div>, rather than the default inline <span> used by FadeTransition.
  // This fixes a bug where the crossfade between results when searching/sorting did not play on WebKit/Safari.
  const fadeRef = React.useRef<HTMLDivElement>(null)

  // Fills the page surface, so zoom origins measured against it match the surface's transform origin.
  const pageRef = React.useRef<HTMLDivElement>(null)

  return (
    <div ref={pageRef} className={css({ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 })}>
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
            onInput={value => dispatch(commandUniverseSearchActionCreator(value))}
          />
          <CommandUniverseSortButton
            sortOrder={sortOrder}
            onSortChange={value => dispatch(commandUniverseSortActionCreator(value))}
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
              groups={sections}
              search={search}
              onItemTap={(command, origin) => dispatch(commandUniverseNavigate('detail', { command }, { origin }))}
              onItemActivate={activate}
              onNavigateBack={() => dispatch(commandUniverseBack())}
            />
          )
        ) : (
          <SwitchTransition>
            {/* Use a key here composed of the sort order and search query to crossfade when search results change. */}
            <FadeTransition
              key={`${sortOrder}-${search}`}
              in={true}
              type='medium'
              unmountOnExit
              nodeRef={fadeRef}
              onEnter={() => scrollRef.current?.scrollTo({ top: 0 })}
            >
              <div ref={fadeRef}>
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={css({
                      position: 'relative',
                      contain: 'layout paint',
                    })}
                  >
                    {/* Section header row — centered title flanked by gradient hairlines that fade outward to delimit each command section. */}
                    <div
                      className={css({
                        display: 'flex',
                        alignItems: 'center',
                        // 1rem horizontal gap between the title text and the gradient hairlines.
                        gap: '1rem',
                        paddingBlock: '1.25rem',
                      })}
                      // First section sits flush against the search row — skip its top padding so it doesn't double up.
                      style={index === 0 ? { paddingTop: 0 } : undefined}
                    >
                      {/* Left hairline: transparent at the panel edge, solid near the title. */}
                      <div
                        className={css({
                          flexGrow: 1,
                          height: '1px',
                          // eslint-disable-next-line @pandacss/prefer-token -- every color in the gradient is a token reference
                          background:
                            'linear-gradient(to right, {colors.transparent} 0%, {colors.dialogHeaderDivider} 100%)',
                        })}
                      />
                      <h2
                        className={css({
                          fontSize: '1rem',
                          fontWeight: 500,
                          color: 'fg',
                          borderBottom: 'none',
                          margin: 0,
                          whiteSpace: 'nowrap',
                        })}
                      >
                        {section.title}
                      </h2>
                      {/* Right hairline: solid near the title, fading to transparent at the panel edge. */}
                      <div
                        className={css({
                          flexGrow: 1,
                          height: '1px',
                          // eslint-disable-next-line @pandacss/prefer-token -- every color in the gradient is a token reference
                          background:
                            'linear-gradient(to right, {colors.dialogHeaderDivider} 0%, {colors.transparent} 100%)',
                        })}
                      />
                    </div>
                    <CommandUniverseGrid
                      commands={section.commands}
                      search={search}
                      scrollRootRef={scrollRef}
                      pageRef={pageRef}
                    />
                  </div>
                ))}
              </div>
            </FadeTransition>
          </SwitchTransition>
        )}
      </DialogContent>
    </div>
  )
}

const CommandUniverseCommandPage = React.memo(CommandUniverseCommandPageComponent)
CommandUniverseCommandPage.displayName = 'CommandUniverseCommandPage'

export default CommandUniverseCommandPage
