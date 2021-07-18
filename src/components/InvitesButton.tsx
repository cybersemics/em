import React from 'react'
import { showModal, getUserInvites } from '../action-creators'
import InvitesIcon from './icons/InvitesIcon'
import { connect, useDispatch } from 'react-redux'
import { Connected, State } from '../@types'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { user } = state
  return { user }
}

/**
 * Button that opens Invites model.
 */
const InvitesButton = ({ user }: Connected<ReturnType<typeof mapStateToProps>>) => {
  const dispatch = useDispatch()
  return (
    <div
      style={{ display: 'inline-flex' }}
      onClick={() => {
        dispatch(showModal({ id: 'invites' }))
        dispatch(getUserInvites(user ? user.uid : ''))
      }}
    >
      <InvitesIcon size={24} />
    </div>
  )
}

export default connect(mapStateToProps)(InvitesButton)
