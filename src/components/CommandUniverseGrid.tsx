import { RefObject } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { UseCommandListReturn } from '../hooks/useCommandList'
import nonNull from '../util/nonNull'
import CommandUniverseGridItem from './CommandUniverseGridItem'

interface CommandUniverseGridProps {
  sections: UseCommandListReturn['sections']
  /** Search text that will be highlighted within the matched command title. */
  search?: string
  /** The inner dialog scroller used to decide which gesture diagrams are near view. */
  scrollRootRef: RefObject<HTMLDivElement | null>
  /** The page root that zoom origins are measured against. */
  pageRef: RefObject<HTMLDivElement | null>
  /** Keys (`command:<id>`) of the cells that must render their gesture diagrams whether or not they have been reported near view yet. */
  forceGestureKeys: ReadonlySet<string>
}

/** A section header row: a centered title flanked by gradient hairlines that fade outward to delimit each command section. Spans both columns of the grid. */
const CommandUniverseSectionHeader = ({
  section,
  first,
}: {
  section: UseCommandListReturn['sections'][number]
  /** True for the first section, which sits flush against the search row. */
  first: boolean
}) => (
  // The key that useRearrangeAnimation tracks this header by when it animates a sort or search rearranging the grid.
  <tr data-rearrange-key={`section:${section.id}`} className={css({ gridColumn: '1 / -1' })}>
    <td
      className={css({
        display: 'flex',
        alignItems: 'center',
        // 1rem horizontal gap between the title text and the gradient hairlines.
        gap: '1rem',
        // The header's 1.25rem of block padding, less the grid gap it sits within.
        paddingBlock: 'calc(1.25rem - var(--command-universe-grid-gap))',
      })}
      // First section sits flush against the search row — skip its top padding so it doesn't double up.
      style={first ? { paddingTop: 0 } : undefined}
    >
      {/* Left hairline: transparent at the panel edge, solid near the title. */}
      <div
        className={css({
          flexGrow: 1,
          height: '1px',
          background: 'linear-gradient(to right, {colors.transparent} 0%, {colors.dialogHeaderDivider} 100%)',
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
          background: 'linear-gradient(to right, {colors.dialogHeaderDivider} 0%, {colors.transparent} 100%)',
        })}
      />
    </td>
  </tr>
)

/**
 * Renders the command sections of the Command Universe as a single 2-column grid, with each section header spanning both columns. Pure presentation: receives pre-filtered sections and renders them. Chrome (search bar, sort button) lives in the parent.
 *
 * Every section shares one grid so that a command keeps its element when a sort or search moves it to another section. This lets the parent animate the rearrangement, and spares each cell from remounting and re-rendering its gesture diagram.
 */
const CommandUniverseGrid = ({
  sections,
  search,
  scrollRootRef,
  pageRef,
  forceGestureKeys,
}: CommandUniverseGridProps) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <table className={css({ fontSize: '14px' })}>
      <tbody
        className={css({
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          // The section headers subtract this from their padding, so it is a variable they can read.
          '--command-universe-grid-gap': '0.75rem',
          gap: 'var(--command-universe-grid-gap)',
        })}
        // anchor all `em` units used in children to `fontSize`.
        style={{ fontSize }}
      >
        {sections.flatMap((section, index) => [
          <CommandUniverseSectionHeader key={`section:${section.id}`} section={section} first={index === 0} />,
          ...section.commands
            .filter(nonNull)
            .map(command => (
              <CommandUniverseGridItem
                key={`command:${command.id}`}
                command={command}
                search={search}
                scrollRootRef={scrollRootRef}
                pageRef={pageRef}
                forceGesture={forceGestureKeys.has(`command:${command.id}`)}
              />
            )),
        ])}
      </tbody>
    </table>
  )
}

export default CommandUniverseGrid
