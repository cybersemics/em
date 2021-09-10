import React, { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { alert, login } from '../action-creators'
import { FIREBASE_REDIRECT_URL } from '../constants'
import { ActionButton } from './ActionButton'
import { Index } from '../@types'
import { storage } from '../util/storage'
import Modal from './Modal'
import tw, { styled } from 'twin.macro'
import TextLink from './TextLink'
import Input from './Input'
import Message from './Message'

const firebaseErrorsIndex = {
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/email-already-in-use': 'Account already exists',
  'auth/invalid-email': 'Invalid email',
  'auth/wrong-password': 'Invalid username or password',
  'auth/user-not-found': 'User not found',
  'auth/too-many-requests': 'Account temporarily disabled. You can restore it by resetting your password',
  default: 'Something went wrong',
}

type errorCode = keyof typeof firebaseErrorsIndex

type SubmitAction = (closeModal: () => void, email: string, password?: string) => Promise<void>

interface Mode {
  name: string
  modalKey: string
  modalTitle: string
}

const modes: Index<Mode> = {
  login: {
    name: 'login',
    modalKey: 'login',
    modalTitle: 'Log In',
  },
  resetPassword: {
    name: 'resetPassword',
    modalKey: 'resetPassword',
    modalTitle: 'Reset Password',
  },
}
const Wrapper = styled.div<{ active?: boolean }>`
  ${tw`flex flex-col gap-4`}
  ${props => props.active && tw`-mb-12`}
`

const FormGroup = styled.form`
  ${tw`
  sm:(padding[0 20%])`}

  ${Input} {
    ${tw`
      mb-2.5
    `}
  }
`

/** A modal dialog for signing up, logging in, and resetting password. */
const ModalAuth = () => {
  /** Checks if the given mode is active. */
  const isModeActive = (mode: Mode) => activeMode.name === mode.name

  const [activeMode, updateActiveMode] = useState(modes.login)
  const [email, updateEmail] = useState('')
  const [password, updatePassword] = useState('')
  const [error, updateError] = useState<null | string>(null)

  const [isSubmitting, updateIsSubmitting] = useState(false)

  const dispatch = useDispatch()

  /** Reset password using reset email. */
  const resetPassword: SubmitAction = useCallback(async (closeModal, email) => {
    updateIsSubmitting(true)

    try {
      await window.firebase.auth().sendPasswordResetEmail(email, { url: FIREBASE_REDIRECT_URL! })
      updateIsSubmitting(false)
    } catch (error) {
      updateIsSubmitting(false)
      return updateError(error.message || firebaseErrorsIndex.default)
    }
    dispatch(alert('Please check your email'))
    closeModal()
  }, [])

  /** Login with email and password. */
  const loginWithEmailAndPassword: SubmitAction = useCallback(async (closeModal, email, password) => {
    updateIsSubmitting(true)
    try {
      await window.firebase.auth().signInWithEmailAndPassword(email, password!)
      storage.setItem('modal-to-show', 'welcome')
      updateIsSubmitting(false)
      closeModal()
    } catch (error) {
      updateIsSubmitting(false)
      return updateError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
    }
  }, [])

  const submitAction = isModeActive(modes.login) ? loginWithEmailAndPassword : resetPassword

  /**
   * Reset Email and Password fields.
   */
  const resetFormFields = () => {
    updateEmail('')
    updatePassword('')
    updateError(null)
  }

  /**
   * Login using google account.
   */
  const signInWithGoogle = () => {
    updateIsSubmitting(true)
    dispatch(login())
  }

  useEffect(() => {
    resetFormFields()
  }, [activeMode])

  /** Handle email change. */
  const onChangeEmail = (e: ChangeEvent<HTMLInputElement>) => updateEmail(e.target.value)

  /** Handle password change. */
  const onChangePassword = (e: ChangeEvent<HTMLInputElement>) => updatePassword(e.target.value)

  /** Show Login with email and password. */
  const showLogin = () => updateActiveMode(modes.login)

  /** Show Password recovery assistance. */
  const showForgotPassword = () => updateActiveMode(modes.resetPassword)

  return (
    <Modal
      id='auth'
      title={activeMode.modalTitle}
      className='popup'
      center
      preventCloseOnEscape={true}
      actions={({ close: closeModal }) => (
        <Wrapper active={isModeActive(modes.resetPassword)}>
          <ActionButton
            key={activeMode.modalKey}
            title={activeMode.modalTitle}
            active={true}
            isLoading={isSubmitting}
            onClick={() => submitAction(closeModal, email, password)}
          />

          {!isModeActive(modes.login) && (
            <TextLink as='button' disabled={isSubmitting} onClick={showLogin}>
              {isModeActive(modes.resetPassword) ? 'Back to Login' : 'Log in'}
            </TextLink>
          )}

          {!isModeActive(modes.resetPassword) && (
            <TextLink as='button' disabled={isSubmitting} onClick={signInWithGoogle}>
              Sign in with Google
            </TextLink>
          )}

          <TextLink
            id='cancel-login'
            as='button'
            disabled={isSubmitting}
            key='cancel'
            onClick={() => closeModal()}
            colorVariant='gray'
          >
            Work Offline
          </TextLink>
        </Wrapper>
      )}
    >
      <FormGroup>
        <Input type='email' placeholder='email' value={email} onChange={onChangeEmail} />

        {!isModeActive(modes.resetPassword) && (
          <Input type='password' placeholder='password' value={password} onChange={onChangePassword} />
        )}
      </FormGroup>

      <div css={tw`text-center mt-4`}>
        {isModeActive(modes.login) && (
          <TextLink as='button' variant='text' disabled={isSubmitting} onClick={showForgotPassword}>
            Forgot Password?
          </TextLink>
        )}
      </div>

      {error && (
        <Message
          type='error'
          css={`
            ${tw`m-4`}
          `}
        >
          {error}
        </Message>
      )}
    </Modal>
  )
}

export default ModalAuth
