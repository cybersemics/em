import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { TOOLBAR_DEFAULT_COMMANDS } from '../../constants'
import getUserToolbar from '../../selectors/getUserToolbar'
import PanelCommand from './PanelCommand'

/**
 * Component that displays the grid for the command menu.
 */
const PanelCommandGrid = () => {
  const commandIds = useSelector(state => {
    const userCommandIds = getUserToolbar(state)
    return userCommandIds || state.storageCache?.userToolbar || TOOLBAR_DEFAULT_COMMANDS
  })

  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        padding: '1rem',
      })}
    >
      {commandIds.map(commandId => (
        <PanelCommand key={commandId} commandId={commandId} size='medium' />
      ))}
    </div>
  )
}

export default PanelCommandGrid
