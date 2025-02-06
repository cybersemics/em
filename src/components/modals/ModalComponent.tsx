import { Capacitor } from '@capacitor/core'
import React, { PropsWithChildren } from 'react'
import { css, cx } from '../../../styled-system/css'
import { modalRecipe } from '../../../styled-system/recipes'
import ModalType from '../../@types/Modal'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { isIOS } from '../../browser'
import { FADEOUT_DURATION } from '../../constants'
import store from '../../stores/app'
import fastClick from '../../util/fastClick'

interface ModalActionHelpers {
  close: (fullReload?: any, duration?: number) => void
}

export type ModalProps = PropsWithChildren<{
  center?: boolean
  hideClose?: boolean
  hideModalActions?: boolean
  id: ModalType
  onClose?: () => void
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  style?: React.CSSProperties
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title?: string
  top?: number
  preventCloseOnEscape?: boolean
}>

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
        this.ref.current.classList.add(css({ opacity: 0 }))
      }
      setTimeout(() => {
        store.dispatch(closeModal())
      }, FADEOUT_DURATION)
    }

    // use capturing so that this fires before the global window Escape which removes the cursor
    window.addEventListener('keydown', this.onKeyDown, true)
  }

  close = (fullReload: any = false) => {
    this.animateAndClose!()
    this.props.onClose?.()
    if (Capacitor.isNativePlatform() && fullReload) {
      window.location.reload()
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown!, true)
  }

  render() {
    const { actions, center, children, hideClose, hideModalActions, id, style, title, top } = this.props

    const modalClasses = modalRecipe({ id, center })

    return (
      <div ref={this.ref} style={style} className={cx(modalClasses.root, css({ ...(top ? { top: 55 } : null) }))}>
        {!this.props.preventCloseOnEscape && !hideClose && (
          <a
            className={css({
              /* extend click area */
              padding: '10px 20px',
              margin: '-10px -20px',
              position: 'fixed',
              right: '11px',
              // inherit not yet supported by plugin
              // eslint-disable-next-line @pandacss/no-hardcoded-color
              color: 'inherit',
              textDecoration: 'none',
              /* spacing.safeAreaTop applies for rounded screens */
              top: 'calc(token(spacing.safeAreaTop) + 9px - 0.2em)',
              ...(isIOS && {
                marginTop: '48px',
              }),
            })}
            {...fastClick(this.close)}
          >
            ✕
          </a>
        )}
        <div
          aria-label='modal-content'
          className={css({
            maxWidth: '40em',
            margin: '0 auto',
            maxHeight: 'none',
          })}
        >
          {title && <h1 className={modalClasses.title}>{title}</h1>}
          <div className={modalClasses.text}>{children}</div>
          {!hideModalActions && actions && (
            <div className={modalClasses.actions}>
              {actions({
                close: this.close,
              })}
            </div>
          )}
          {!hideClose && (
            // TODO: should be controlled by hideClose, not class
            <a
              className={css({
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                fontSize: '12px',
                verticalAlign: 'middle',
                textAlign: 'center',
                padding: '10px',
                display: 'none',
                '& span': {
                  display: 'inline-block',
                  width: '11px',
                  height: '11px',
                  color: 'bgOverlay30',
                  borderColor: 'bgOverlay30',
                },
              })}
              {...fastClick(() => this.close())}
            >
              <span>✕</span>
            </a>
          )}
        </div>
      </div>
    )
  }
}

export default ModalComponent
