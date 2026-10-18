import { RefObject } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import nonNull from '../util/nonNull'
import CommandUniverseGridItem from './CommandUniverseGridItem'

interface CommandUniverseGridProps {
  commands: Command[]
  /** Search text that will be highlighted within the matched command title. */
  search?: string
  /** The inner dialog scroller used to decide which gesture diagrams are near view. */
  scrollRootRef: RefObject<HTMLDivElement | null>
  /** The page root that zoom origins are measured against. */
  pageRef: RefObject<HTMLDivElement | null>
}

/** Renders a 2-column grid of commands for the Command Universe surfaces. Pure presentation: receives pre-filtered commands and renders them. Chrome (search bar, sort button) lives in the parent. */
const CommandUniverseGrid = ({ commands, search, scrollRootRef, pageRef }: CommandUniverseGridProps) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <table className={css({ fontSize: '14px' })}>
      <tbody
        className={css({
          display: 'grid',
          // Two columns while each can be at least 6rem wide, which holds on a phone up to about font size 25. Past that the grid drops to one column rather than squeezing the text.
          gridTemplateColumns: 'repeat(auto-fill, minmax(max(6rem, calc(50% - 6px)), 1fr))',
          // The gap between rows grows with the text. The gutter between columns is fixed, so that a larger font size leaves the room to the text (6px above is half of it).
          rowGap: '0.75rem',
          columnGap: '12px',
        })}
        // anchor all `em` units used in children to `fontSize`.
        style={{ fontSize }}
      >
        {commands.filter(nonNull).map(command => (
          <CommandUniverseGridItem
            key={command.id}
            command={command}
            search={search}
            scrollRootRef={scrollRootRef}
            pageRef={pageRef}
          />
        ))}
      </tbody>
    </table>
  )
}

export default CommandUniverseGrid
