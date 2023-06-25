import React from 'react'
import { useDispatch } from 'react-redux'
import showModal from '../action-creators/showModal'
import fastClick from '../util/fastClick'
import InvitesIcon from './icons/InvitesIcon'

/**
 * Button that opens Invites model.
 */
const InvitesButton = () => {
  const dispatch = useDispatch()
  return (
    <div style={{ display: 'inline-flex' }} {...fastClick(() => dispatch(showModal({ id: 'invites' })))}>
      <InvitesIcon size={24} />
    </div>
  )
}

export default InvitesButton
