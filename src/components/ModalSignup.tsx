import React, { ChangeEvent, FC, useCallback, useEffect, useState, useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import { removeInvitationCode } from '../action-creators'
import { ActionButton } from './ActionButton'
import { Index, Connected, State } from '../@types'
import Modal from './Modal'

const firebaseErrorsIndex = {
  'signup/no-code':
    'em is currently in beta. Please join the waitlist, or find a friendly person who can offer you an invite to gain access immediately.',
  'signup/invalid-code': 'Invalid invitation code',
  'signup/already-used-code': 'This invitation code has already been used',
  default: 'Something went wrong',
}

type errorCode = keyof typeof firebaseErrorsIndex

type SubmitAction = (closeModal: () => void, email: string, password?: string) => Promise<void>

interface InputProps {
  type: 'email' | 'password'
  placeholder: string
  onBlur: (e: ChangeEvent<HTMLInputElement>) => void
  value: string
}
/**
 *
 */
const Input: FC<InputProps> = ({ type, placeholder, value, onBlur }) => {
  const [inputValue, updateInputValue] = useState(value)

  useEffect(() => {
    updateInputValue(value)
  }, [value])

  /** On input change handler. */
  const onChange = (e: ChangeEvent<HTMLInputElement>) => updateInputValue(e.target.value)

  return <input type={type} placeholder={placeholder} value={inputValue} onChange={onChange} onBlur={onBlur} />
}

interface Mode {
  name: string
  modalKey: string
  modalTitle: string
}

const modes: Index<Mode> = {
  signup: {
    name: 'signup',
    modalKey: 'signup',
    modalTitle: 'Sign Up',
  },
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { invitationCode, invite } = state
  return {
    invitationCode,
    invite,
  }
}

/** A modal dialog for signing up. */
const ModalSignup = ({ invitationCode, invite }: Connected<ReturnType<typeof mapStateToProps>>) => {
  const isMounted = useRef(false)
  const [email, updateEmail] = useState('')
  const [password, updatePassword] = useState('')
  const [error, updateError] = useState<null | string>(null)

  const [isSubmitting, updateIsSubmitting] = useState(false)

  const dispatch = useDispatch()
  useEffect(() => {
    const hasInvite = invite && Object.keys(invite).length === 0
    let errorCode = ''
    if (invitationCode === '') {
      errorCode = 'signup/no-code'
    } else if (!isMounted.current && hasInvite) {
      isMounted.current = true
      errorCode = ''
    } else if (hasInvite) {
      errorCode = 'signup/invalid-code'
    } else if (invite && invite.usedBy) {
      errorCode = 'signup/already-used-code'
    }

    updateError(firebaseErrorsIndex[errorCode as errorCode])
    return () => {
      isMounted.current = false
    }
  }, [invitationCode, invite])

  /** Sign up with email and password. */
  const submitAction: SubmitAction = useCallback(async (closeModal, email, password) => {
    updateIsSubmitting(true)
    try {
      await window.firebase.auth().createUserWithEmailAndPassword(email, password!)
      closeModal()
      updateIsSubmitting(false)
      dispatch(removeInvitationCode())
    } catch (error) {
      updateIsSubmitting(false)
      return updateError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
    }
  }, [])

  /** Handle email change. */
  const onChangeEmail = (e: ChangeEvent<HTMLInputElement>) => updateEmail(e.target.value)

  /** Handle password change. */
  const onChangePassword = (e: ChangeEvent<HTMLInputElement>) => updatePassword(e.target.value)

  return (
    <Modal
      id='signup'
      title={modes.signup.modalTitle}
      className='popup'
      center
      actions={({ close: closeModal }) => (
        <div style={undefined}>
          <ActionButton
            key={modes.signup.modalKey}
            title={modes.signup.modalTitle}
            active={true}
            isLoading={isSubmitting}
            onClick={() => submitAction(closeModal, email, password)}
          />
        </div>
      )}
    >
      <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
        {error && <span style={{ color: 'crimson', paddingBottom: '30px' }}>{error}</span>}
        <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />
        <Input type='password' placeholder='password' value={password} onBlur={onChangePassword} />
      </div>
    </Modal>
  )
}

export default connect(mapStateToProps)(ModalSignup)
