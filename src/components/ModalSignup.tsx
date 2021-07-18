import React, { ChangeEvent, FC, useCallback, useEffect, useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import { ActionButton } from './ActionButton'
import { Index, Connected, State } from '../@types'
import { showModal } from '../action-creators'
import Modal from './Modal'
import { storage } from '../util/storage'

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
  const { invitationCode, invitationCodeDetail } = state
  return {
    invitationCode,
    invitationCodeDetail,
  }
}

/** A modal dialog for signing up. */
const ModalSignup = ({ invitationCode, invitationCodeDetail }: Connected<ReturnType<typeof mapStateToProps>>) => {
  const dispatch = useDispatch()
  const [email, updateEmail] = useState('')
  const [password, updatePassword] = useState('')
  const [error, updateError] = useState<null | string>(null)

  const [isSubmitting, updateIsSubmitting] = useState(false)

  useEffect(() => {
    const hasInvite = invitationCodeDetail && Object.keys(invitationCodeDetail).length === 0
    let errorCode = ''
    if (invitationCode === '') {
      errorCode = 'signup/no-code'
    } else if (hasInvite) {
      errorCode = 'signup/invalid-code'
    } else if (invitationCodeDetail && invitationCodeDetail.usedBy) {
      errorCode = 'signup/already-used-code'
    }

    updateError(firebaseErrorsIndex[errorCode as errorCode])
  }, [invitationCode, invitationCodeDetail])

  useEffect(() => {
    if (isSubmitting) storage.setItem('user-login', 'true')
  }, [isSubmitting])

  /** Sign up with email and password. */
  const submitAction: SubmitAction = useCallback(async (closeModal, email, password) => {
    updateIsSubmitting(true)
    try {
      await window.firebase.auth().createUserWithEmailAndPassword(email, password!)
      closeModal()
      updateIsSubmitting(false)
    } catch (error) {
      updateIsSubmitting(false)
      return updateError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
    }
  }, [])

  /** Handle email change. */
  const onChangeEmail = (e: ChangeEvent<HTMLInputElement>) => updateEmail(e.target.value)

  /** Handle password change. */
  const onChangePassword = (e: ChangeEvent<HTMLInputElement>) => updatePassword(e.target.value)

  /** Show Login with email and password. */
  const showLogin = () => dispatch(showModal({ id: 'auth' }))

  if (error) {
    return (
      <Modal
        id='signup'
        title={modes.signup.modalTitle}
        className='popup'
        center
        actions={() => (
          <div style={undefined}>
            <button
              disabled={isSubmitting}
              className='button'
              onClick={showLogin}
              style={{ textDecoration: 'underline', marginTop: 15 }}
            >
              Log in
            </button>
          </div>
        )}
      >
        <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
          <span style={{ color: 'crimson', paddingBottom: '30px' }}>{error}</span>
        </div>
      </Modal>
    )
  }

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

          <button
            disabled={isSubmitting}
            className='button'
            onClick={showLogin}
            style={{ textDecoration: 'underline', marginTop: 15 }}
          >
            Log in
          </button>
        </div>
      )}
    >
      <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
        <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />
        <Input type='password' placeholder='password' value={password} onBlur={onChangePassword} />
      </div>
    </Modal>
  )
}

export default connect(mapStateToProps)(ModalSignup)
