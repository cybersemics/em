import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import Index from '../../@types/IndexType'
import { alertActionCreator as alert } from '../../actions/alert'
import { loginActionCreator as login } from '../../actions/login'
import fastClick from '../../util/fastClick'
import storage from '../../util/storage'
import { ActionButton } from './../ActionButton'
import ModalComponent from './ModalComponent'

const errorsIndex = {
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/email-already-in-use': 'Account already exists',
  'auth/invalid-email': 'Invalid email',
  'auth/wrong-password': 'Invalid username or password',
  'auth/user-not-found': 'User not found',
  'auth/too-many-requests': 'Account temporarily disabled. You can restore it by resetting your password',
  default: 'Something went wrong',
}

type errorCode = keyof typeof errorsIndex

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
  const resetPassword: SubmitAction = useCallback(
    async (closeModal, email) => {
      updateIsSubmitting(true)

      throw new Error('Not implemented')
      try {
        // await window.firebase.auth().sendPasswordResetEmail(email, { url: FIREBASE_REDIRECT_URL! })
        updateIsSubmitting(false)
      } catch (e: any) {
        updateIsSubmitting(false)
        return updateError(e.message || errorsIndex.default)
      }
      dispatch(alert('Please check your email'))
      closeModal()
    },
    [dispatch],
  )

  /** Login with email and password. */
  const loginWithEmailAndPassword: SubmitAction = useCallback(async (closeModal, email, password) => {
    updateIsSubmitting(true)
    throw new Error('Not implemented')
    try {
      // await window.firebase.auth().signInWithEmailAndPassword(email, password!)
      storage.setItem('modal-to-show', 'welcome')
      updateIsSubmitting(false)
      closeModal()
    } catch (e: any) {
      updateIsSubmitting(false)
      return updateError(errorsIndex[e?.code as errorCode] || errorsIndex.default)
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
    <ModalComponent
      id='auth'
      title={activeMode.modalTitle}
      className='popup'
      center
      preventCloseOnEscape={true}
      actions={({ close: closeModal }) => (
        <div style={isModeActive(modes.resetPassword) ? { marginTop: '-50px' } : undefined}>
          <ActionButton
            key={activeMode.modalKey}
            title={activeMode.modalTitle}
            active={true}
            isLoading={isSubmitting}
            {...fastClick(() => submitAction(closeModal, email, password))}
          />

          {!isModeActive(modes.login) && (
            <button
              disabled={isSubmitting}
              className='button'
              {...fastClick(showLogin)}
              style={{ textDecoration: 'underline', marginTop: 15 }}
            >
              {isModeActive(modes.resetPassword) ? 'Back to Login' : 'Log in'}
            </button>
          )}

          {!isModeActive(modes.resetPassword) && (
            <button
              disabled={isSubmitting}
              className='button'
              style={{ textDecoration: 'underline', marginTop: 15 }}
              {...fastClick(signInWithGoogle)}
            >
              Sign in with Google
            </button>
          )}

          <button
            disabled={isSubmitting}
            className='button'
            key='cancel'
            style={{ fontSize: '1.2rem', opacity: 0.5, marginTop: 12 }}
          >
            <a
              id='cancel-login'
              {...fastClick(() => {
                // prevent the login modal on refresh once working offline
                storage.setItem('modal-to-show', '')
                closeModal()
              })}
            >
              Work Offline
            </a>
          </button>
        </div>
      )}
    >
      <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
        <input type='email' placeholder='email' value={email} onChange={onChangeEmail} />

        {!isModeActive(modes.resetPassword) && (
          <input type='password' placeholder='password' value={password} onChange={onChangePassword} />
        )}

        {isModeActive(modes.login) && (
          <button disabled={isSubmitting} className='button' {...fastClick(showForgotPassword)}>
            Forgot Password?
          </button>
        )}

        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>
    </ModalComponent>
  )
}

export default ModalAuth
