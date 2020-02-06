import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from './Modal.js'
import { DropDownMenu } from './DropDownMenu.js'
import '../App.css'
import ArrowDown from '../images/keyboard_arrow_down_352466.svg'
//  util's.js
import {
  ellipsize,
  headValue,
  getDescendants
} from '../util'

export const ModalExport = () => {
  const dispatch = useDispatch()
  const cursor = useSelector(state => state.cursor)
  const execFunc = useSelector(state => state.execFunc)
  const [format, setFormat] = React.useState({ f1: 'plaintext', f2: 'Plain Text' })
  const [isOpen, handleMenu] = React.useState(false)
  const exportInfo = `${ellipsize(headValue(cursor))} and ${getDescendants(cursor).length} subthoughts as ${format.f2} `
  return (
    <Modal id='export' title='Export' className='popup'>
      <div className='modal-export-container'>
        <div className='modal-export-info-text'>{`Export ${exportInfo}`}</div>
        <div className='modal-export-drop-down'>
          <img
            src={ArrowDown}
            alt='Arrow'
            height='22px'
            width='22px'
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenu(!isOpen)}
          />
          <DropDownMenu
            isOpen={isOpen}
            setFormat={setFormat}
            format={format}
          />
        </div>
      </div>
      <button
        className='modal-export-btn-export'
        onClick={(e) => execFunc('exportContext').exec(e, format.f1)}
      >
        Export
      </button>
      <button
        className='modal-export-btn-cancel'
        onClick={(e) => {
        dispatch({ type: 'modalRemindMeLater', id: 'help' })
      }}>
        Cancel
      </button>
    </Modal>
  )
}
