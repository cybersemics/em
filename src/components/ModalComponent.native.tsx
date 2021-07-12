/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
/* import classNames from 'classnames'
import { FADEOUT_DURATION, MODAL_CLOSE_DURATION } from '../constants'
import { modalCleanup } from '../util'
import { Connected } from '../@types' */
import { /* closeModal */ modalComplete /* tutorial */ } from '../action-creators'
import { useDispatch } from 'react-redux'
import { Modal, View, StyleSheet, ScrollView } from 'react-native'
import { Text } from './Text.native'

interface ModalActionHelpers {
  close: (duration?: number) => void
  // complete: typeof ModalComponent,
}

export interface ModalProps {
  hideModalActions?: boolean
  id: string
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  show?: boolean
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
}

/** A generic modal component. */
const ModalComponent: React.FC<ModalProps> = props => {
  const dispatch = useDispatch()

  /** Dispatches a remindMeLater action for the modal. */
  // const remindMeLater = () => dispatch(closeModal({ id: props.id }))

  /** Dispatches a modalComplete action for the modal. */
  const close = () => dispatch(modalComplete(props.id))

  /** Dispatches a tutorial action that ends the tutorial. */
  // const endTutorial = () => dispatch(tutorial({ value: false }))

  const { show, id, title, actions, children, hideModalActions /* onSubmit */ } = props

  if (!show) return null

  return (
    <Modal animationType='slide' visible={show} onRequestClose={close}>
      <View style={styles.centeredView}>
        {id !== 'welcome' ? (
          <Text style={styles.close} onPress={close}>
            ✕
          </Text>
        ) : null}

        <ScrollView>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View>{children}</View>

          <View>{!hideModalActions && actions && actions({ close })}</View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    paddingVertical: 40,
    backgroundColor: '#000',
    paddingHorizontal: 15,
  },
  close: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: 16,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 10,
  },
})

export default ModalComponent
