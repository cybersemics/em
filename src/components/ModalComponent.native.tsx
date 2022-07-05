/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'

/* import classNames from 'classnames'
import { FADEOUT_DURATION, MODAL_CLOSE_DURATION } from '../constants'
import { Connected } from '../@types' */
import modalComplete from '../action-creators/modalComplete'
import { commonStyles } from '../style/commonStyles'
import { Text } from './Text.native'

const { title: titleStyle, flexOne, darkBackground, verticalPadding, horizontalPadding } = commonStyles

interface ModalActionHelpers {
  close: (duration?: number) => void
  // complete: typeof ModalComponent,
}

export interface ModalProps {
  hideModalActions?: boolean
  id: string
  onClose?: () => void
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  show?: boolean
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  preventCloseOnEscape?: boolean
}

/** A generic modal component. */
const ModalComponent: React.FC<ModalProps> = props => {
  const dispatch = useDispatch()

  /** Dispatches a remindMeLater action for the modal. */
  // const remindMeLater = () => dispatch(closeModal({ id: props.id }))

  /** Dispatches a modalComplete action for the modal. */
  const close = () => {
    dispatch(modalComplete(props.id))
    props.onClose?.()
  }

  /** Dispatches a tutorial action that ends the tutorial. */
  // const endTutorial = () => dispatch(tutorial({ value: false }))

  const { show, title, actions, children, hideModalActions /* onSubmit */ } = props

  if (!show) return null

  return (
    <Modal animationType='slide' visible={show} onRequestClose={close}>
      <View style={[flexOne, darkBackground, verticalPadding, horizontalPadding]}>
        {!props.preventCloseOnEscape && (
          <Text style={styles.close} onPress={close}>
            ✕
          </Text>
        )}

        <ScrollView>
          {title ? <Text style={titleStyle}>{title}</Text> : null}
          <View>{children}</View>

          <View>{!hideModalActions && actions && actions({ close })}</View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  close: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: 16,
  },
})

export default ModalComponent
