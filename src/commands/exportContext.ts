import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import ShareIcon from '../components/icons/ShareIcon'
import { HOME_TOKEN } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import hasMulticursor from '../selectors/hasMulticursor'

const command = {
  id: 'exportContext',
  label: 'Export',
  description: 'Download or copy the current context as plaintext or html.',
  svg: ShareIcon,
  multicursor: false,
  canExecute: state => {
    if (state.cursor || hasMulticursor(state)) return true
    return getAllChildren(state, HOME_TOKEN).length > 0
  },
  exec: dispatch => dispatch(showModal({ id: 'export' })),
  allowExecuteFromModal: true,
} satisfies Command

export default command
