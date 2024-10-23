import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { showModalActionCreator as showModal } from '../actions/showModal'
import fastClick from '../util/fastClick'
import InvitesIcon from './icons/InvitesIcon'

/**
 * Button that opens Invites model.
 */
const InvitesButton = () => {
  const dispatch = useDispatch()
  return (
    <div className={css({ display: 'inline-flex' })} {...fastClick(() => dispatch(showModal({ id: 'invites' })))}>
      <InvitesIcon size={24} />
    </div>
  )
}

export default InvitesButton
