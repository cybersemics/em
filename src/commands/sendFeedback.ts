import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import FeedbackIcon from '../components/icons/FeedbackIcon'

const sendFeedback = {
  id: 'sendFeedback',
  label: 'Send Feedback' as const,
  description: 'Send feedback to the em team, optionally attaching files and selected thoughts.',
  gesture: 'rdldr',
  multicursor: false,
  repeatable: false,
  hideAlert: true,
  svg: FeedbackIcon,
  exec: dispatch => dispatch(showModal({ id: 'feedback' })),
} satisfies Command

export default sendFeedback
