import React from 'react'
import { connect, useDispatch } from 'react-redux'
import Connected from '../@types/Connected'
import State from '../@types/State'
import showModal from '../action-creators/showModal'
import InvitesIcon from './icons/InvitesIcon'

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
    <div style={{ display: 'inline-flex' }} onClick={() => dispatch(showModal({ id: 'invites' }))}>
      <InvitesIcon size={24} />
    </div>
  )
}

export default connect(mapStateToProps)(InvitesButton)
