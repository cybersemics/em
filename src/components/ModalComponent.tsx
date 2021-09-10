/* eslint-disable fp/no-class, fp/no-this */
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { FADEOUT_DURATION } from '../constants'
import { Connected } from '../@types'
import { closeModal, modalComplete } from '../action-creators'
import styled, { css } from 'styled-components'
import tw from 'twin.macro'
import { AnimatePresence, motion } from 'framer-motion'

interface ModalActionHelpers {
  close: (duration?: number) => void
  complete: () => void
}

export interface ModalProps {
  arrow?: string
  center?: boolean
  children?: React.ReactNode
  className?: string
  hideModalActions?: boolean
  id: string
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  opaque?: boolean
  show?: boolean
  style?: React.CSSProperties
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  top?: number
  preventCloseOnEscape?: boolean
}

// Styles
const ModalWrapper = styled(motion.div)<{ center?: boolean; opaque?: boolean }>`
  ${tw`
    relative
    p-10
    bg-white
    dark:bg-black
    z-modal
  `}

  ${props =>
    props.center &&
    css`
      left: 0;
      right: 0;
      margin: 0 auto;
    `}
`

const ModalCloseButton = tw.a`
  fixed top-2 right-2 text-base
  text-black
  dark:text-white
  text-decoration[none]
`

const ModalContent = styled.div`
  max-width: 40em;
  margin: 0 auto;
  max-height: none;
`

const ModalTitle = tw.h1`
    mb-24
    text-center
    text-3xl
    font-bold
`

const ModalContentWrapper = tw.div`
  mb-20
`

const ModalActionsContainer = tw.div`
  flex justify-center
  text-center
`

/** A generic modal component. */
const ModalComponent: FC<Connected<ModalProps>> = props => {
  const [closing, setClosing] = useState(false)
  const ref = useRef(null)

  /** Dispatches a modalComplete action for the modal. */
  const complete = () => props.dispatch(modalComplete(props.id))

  /** Dispatches a tutorial action that ends the tutorial. */
  // const endTutorial = () => props.dispatch(tutorial({ value: false }))

  /**
   * Close modal.
   */
  const close = () => animateAndClose!()

  const escapeListener = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !props.preventCloseOnEscape) {
      e.stopPropagation()
      close!()
    }
  }, [])

  const animateAndClose = useCallback(() => {
    const { dispatch } = props
    window.removeEventListener('keydown', escapeListener!, true)
    setClosing(true)
    // TODO: Use prop show to animate unmount instead.
    setTimeout(() => {
      dispatch(closeModal())
    }, FADEOUT_DURATION)
  }, [])

  useEffect(() => {
    if (props.show) {
      // use capturing so that this fires before the global window Escape which removes the cursor
      window.addEventListener('keydown', escapeListener, true)

      return () => {
        window.removeEventListener('keydown', escapeListener!, true)
      }
    }
  }, [])

  const { show, id, title, arrow, center, opaque, className, style, actions, hideModalActions, top, children } = props

  if (!show) return null

  return (
    <AnimatePresence>
      {!closing && (
        <ModalWrapper
          ref={ref}
          opaque={opaque}
          center={center}
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{ duration: 0.5 }}
          style={Object.assign({}, style, top && { top: 55 })}
          // TODO: Refactor  id class name
          className={
            className +
            ' ' +
            classNames({
              [`modal-${id}`]: true,
            })
          }
        >
          {!props.preventCloseOnEscape && (
            <ModalCloseButton id='js-close-modal' onClick={close}>
              ✕
            </ModalCloseButton>
          )}
          <ModalContent
            // TODO: Refactor arrow functionality here
            className={classNames({
              ...(arrow && { [arrow]: arrow }),
            })}
          >
            {title && <ModalTitle>{title}</ModalTitle>}
            <ModalContentWrapper>{children}</ModalContentWrapper>
            {!hideModalActions && actions && (
              <ModalActionsContainer>
                {actions({
                  close: close,
                  complete: complete,
                })}
              </ModalActionsContainer>
            )}
          </ModalContent>
        </ModalWrapper>
      )}
    </AnimatePresence>
  )
}

export default ModalComponent
