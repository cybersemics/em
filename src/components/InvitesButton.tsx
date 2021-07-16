import React from 'react'
import { showModal } from '../action-creators'
import InvitesIcon from './icons/InvitesIcon'
import { useDispatch } from 'react-redux'

/**
 * Button that opens Invites model.
 */
const InvitesButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div style={{ display: 'inline-flex' }} onClick={() => dispatch(showModal({ id: 'invites' }))}>
      <InvitesIcon size={24} />
    </div>
  )
}

export default InvitesButton
