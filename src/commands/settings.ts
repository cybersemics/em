import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import SettingsIcon from '../components/icons/SettingsIcon'

const command = {
  id: 'settings',
  label: 'Settings' as const,
  description: 'Customize your experience of em.',
  keyboard: { key: ',', meta: true },
  multicursor: false,
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
  allowExecuteFromModal: true,
} satisfies Command

export default command
