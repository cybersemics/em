import { css } from '../../../styled-system/css'
import categorize from '../../commands/categorize'
import deleteCommand from '../../commands/delete'
import favorite from '../../commands/favorite'
import indent from '../../commands/indent'
import note from '../../commands/note'
import outdent from '../../commands/outdent'
import swapParent from '../../commands/swapParent'
import toggleDone from '../../commands/toggleDone'
import uncategorize from '../../commands/uncategorize'
import PanelCommand from './PanelCommand'
import PanelCommandGroup from './PanelCommandGroup'

/**
 * Component that displays the grid for the command menu.
 */
const PanelCommandGrid = () => {
  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'auto',
        gridAutoFlow: 'row',
        gap: '0.7rem',
        maxWidth: '100%',
      })}
    >
      <PanelCommand command={{ ...toggleDone, label: 'Done' }} size='small' />
      <PanelCommand command={note} size='small' />
      <PanelCommand command={{ ...favorite, label: 'Favorite' }} size='small' />
      <PanelCommand command={deleteCommand} size='small' />
      <PanelCommandGroup commandSize='small' commandCount={2}>
        <PanelCommand command={{ ...outdent, label: '' }} size='small' />
        <PanelCommand command={{ ...indent, label: '' }} size='small' />
      </PanelCommandGroup>
      <PanelCommand command={swapParent} size='medium' />
      <PanelCommand command={categorize} size='medium' />
      <PanelCommand command={uncategorize} size='medium' />
    </div>
  )
}

export default PanelCommandGrid
