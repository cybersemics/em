import React from 'react'
import { SwitchTransition } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import useCommandList from '../../hooks/useCommandList'
import CommandUniverseGrid from '../CommandUniverseGrid'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import FadeTransition from '../FadeTransition'
import DialogContent from '../dialog/DialogContent'

/**
 * Body of the dialog at Level 2 (the grid). Split out so that useCommandList only runs
 * while the dialog is open. If it ran always, useFilteredCommands inside the hook would
 * remain subscribed to gestureStore, and this would trigger unnecessary re-renders when
 * gestures are inputted.
 */
const CommandUniverseGridPage: React.FC<Record<string, never>> = () => {
  const { search, setSearch, sortOrder, setSortOrder, groups } = useCommandList()

  // Pass this ref to `DialogContent`, which owns the scrollable element, so that we can reset
  // the scroll position to the top as results crossfade.
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // This ref is used to animate a block <div>, rather than the default inline <span> used by FadeTransition.
  // This fixes a bug where the crossfade between results when searching/sorting did not play on WebKit/Safari.
  const fadeRef = React.useRef<HTMLDivElement>(null)

  return (
    <>
      {/* Search row that lives between the header and the scrollable content. Sits outside the scroll
          container so it stays put as the command list scrolls. Left padding matches contentInner so the
          search glyph aligns with the section headers and command list down the left edge of the panel. */}
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          paddingInline: '1rem',
          paddingBlock: '0.5rem',
        })}
      >
        <CommandUniverseSearch onInput={setSearch} />
        <CommandUniverseSortButton onSortChange={setSortOrder} />
      </div>

      <DialogContent scrollRef={scrollRef}>
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
              {groups.map((group, index) => (
                <div
                  key={group.title}
                  className={css({
                    position: 'relative',
                    contain: 'layout paint',
                  })}
                >
                  {/* Section header row — centered title flanked by gradient hairlines that fade outward to delimit each command group. */}
                  <div
                    className={css({
                      display: 'flex',
                      alignItems: 'center',
                      // 1rem horizontal gap between the title text and the gradient hairlines.
                      gap: '1rem',
                      paddingBlock: '1.25rem',
                    })}
                    // First group sits flush against the search row — skip its top padding so it doesn't double up.
                    style={index === 0 ? { paddingTop: 0 } : undefined}
                  >
                    {/* Left hairline: transparent at the panel edge, solid near the title. */}
                    <div
                      className={css({
                        flexGrow: 1,
                        height: '1px',
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
                      {group.title}
                    </h2>
                    {/* Right hairline: solid near the title, fading to transparent at the panel edge. */}
                    <div
                      className={css({
                        flexGrow: 1,
                        height: '1px',
                        background:
                          'linear-gradient(to right, {colors.dialogHeaderDivider} 0%, {colors.transparent} 100%)',
                      })}
                    />
                  </div>
                  <CommandUniverseGrid commands={group.commands} search={search} />
                </div>
              ))}
            </div>
          </FadeTransition>
        </SwitchTransition>
      </DialogContent>
    </>
  )
}

export default CommandUniverseGridPage
