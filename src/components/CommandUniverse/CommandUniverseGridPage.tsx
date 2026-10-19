import React from 'react'
import { css } from '../../../styled-system/css'
import CommandSortType from '../../@types/CommandSortType'
import useCommandList from '../../hooks/useCommandList'
import CommandUniverseGrid from '../CommandUniverseGrid'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import DialogContent from '../dialog/DialogContent'
import useRearrangeAnimation from './useRearrangeAnimation'

/**
 * Body of the dialog at Level 2 (the grid). Split out so that useCommandList only runs
 * while the dialog is open. If it ran always, useFilteredCommands inside the hook would
 * remain subscribed to gestureStore, and this would trigger unnecessary re-renders when
 * gestures are inputted.
 */
const CommandUniverseGridPage: React.FC<Record<string, never>> = () => {
  const { search, setSearch, setSortOrder, sections } = useCommandList()

  // Pass this ref to `DialogContent`, which owns the scrollable element, so that we can reset
  // the scroll position to the top as the results rearrange.
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Fills the page surface, so zoom origins measured against it match the surface's transform origin.
  const pageRef = React.useRef<HTMLDivElement>(null)

  const ghostLayerRef = React.useRef<HTMLDivElement>(null)

  const captureLayout = useRearrangeAnimation({ scrollRef, ghostLayerRef, layoutKey: sections })

  return (
    <div
      ref={pageRef}
      className={css({ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 })}
    >
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
        <CommandUniverseSearch
          onInput={(value: string) => {
            captureLayout()
            setSearch(value)
          }}
        />
        <CommandUniverseSortButton
          onSortChange={(sortOrder: CommandSortType) => {
            captureLayout()
            setSortOrder(sortOrder)
          }}
        />
      </div>

      <DialogContent scrollRef={scrollRef}>
        <CommandUniverseGrid sections={sections} search={search} scrollRootRef={scrollRef} pageRef={pageRef} />
      </DialogContent>

      {/* Holds the ghosts of the cells that leave the view during a rearrangement while they animate out. */}
      <div ref={ghostLayerRef} className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })} />
    </div>
  )
}

const CommandUniverseGridPageMemo = React.memo(CommandUniverseGridPage)
CommandUniverseGridPageMemo.displayName = 'CommandUniverseGridPage'

export default CommandUniverseGridPageMemo
