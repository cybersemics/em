import classNames from 'classnames'
import React from 'react'
import ModalType from '../../@types/Modal'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { FADEOUT_DURATION } from '../../constants'
import store from '../../stores/app'
import fastClick from '../../util/fastClick'

interface ModalActionHelpers {
  close: (duration?: number) => void
}

export interface ModalProps {
  arrow?: string
  center?: boolean
  children?: React.ReactNode
  className?: string
  hideClose?: boolean
  hideModalActions?: boolean
  id: ModalType
  onClose?: () => void
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  opaque?: boolean
  style?: React.CSSProperties
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  top?: number
  preventCloseOnEscape?: boolean
}

/** A generic modal component. */
class ModalComponent extends React.Component<ModalProps> {
  animateAndClose: (() => void) | null = null
  onKeyDown: ((e: KeyboardEvent) => void) | null = null
  ref: React.RefObject<HTMLDivElement>

  constructor(props: ModalProps) {
    super(props)
    this.ref = React.createRef()
  }

  componentDidMount() {
    /**
     * A handler that closes the modal when the escape key is pressed.
     */
    this.onKeyDown = (e: KeyboardEvent) => {
      // TODO: This is a hack to prevent the escape key from closing the modal when the command palette is open.
      // Better to use a global shortcut.
      if (e.key === 'Escape' && !this.props.preventCloseOnEscape && !store.getState().showCommandPalette) {
        e.stopPropagation()
        this.close!()
      }
    }

    /**
     * Animate and close the modal.
     */
    this.animateAndClose = () => {
      window.removeEventListener('keydown', this.onKeyDown!, true)
      if (this.ref.current) {
        this.ref.current.classList.add('animate-fadeout')
      }
      setTimeout(() => {
        store.dispatch(closeModal())
      }, FADEOUT_DURATION)
    }

    // use capturing so that this fires before the global window Escape which removes the cursor
    window.addEventListener('keydown', this.onKeyDown, true)
  }

  close = () => {
    this.animateAndClose!()
    this.props.onClose?.()
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown!, true)
  }

  render() {
    const { actions, arrow, center, children, className, hideClose, hideModalActions, id, opaque, style, title, top } =
      this.props

    return (
      <div
        ref={this.ref}
        style={{ ...style, ...(top ? { top: 55 } : null) }}
        className={
          className +
          ' ' +
          classNames({
            modal: true,
            animate: true,
            [`modal-${id}`]: true,
            center,
            opaque,
          })
        }
      >
        {!this.props.preventCloseOnEscape && !hideClose && (
          <a className='upper-right popup-close-x' {...fastClick(this.close)}>
            ✕
          </a>
        )}
        <div
          className={classNames({
            'modal-content': true,
            ...(arrow && { [arrow]: arrow }),
          })}
        >
          {title && <h1 className='modal-title'>{title}</h1>}
          <div className='modal-text'>{children}</div>
          {!hideModalActions && actions && (
            <div className='modal-actions center'>
              {actions({
                close: this.close,
              })}
            </div>
          )}
          {!hideClose && (
            <a className='modal-close' {...fastClick(() => this.close())}>
              <span>✕</span>
            </a>
          )}
        </div>
      </div>
    )
  }
}

export default ModalComponent
