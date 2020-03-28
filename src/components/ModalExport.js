import React, { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Modal from './Modal.js'
import DropDownMenu from './DropDownMenu.js'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'

//  util
import {
  download,
  ellipsize,
  exportContext,
  getDescendants,
  getSetting,
  headValue,
  pathToContext,
  timestamp
} from '../util'

import alert from '../action-creators/alert.js'
import globals from '../globals.js'

const exportOptions = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

const ModalExport = () => {
  const dispatch = useDispatch()
  const cursor = useSelector(state => state.cursor)

  const [selected, setSelected] = useState(exportOptions[0])
  const [isOpen, setIsOpen] = useState(false)
  const [wrapperRef, setWrapper] = useState()
  const [clipboard, setClipboard] = useState('')

  const dark = getSetting('Theme') !== 'Light'
  const descendants = cursor ? getDescendants(cursor) : []
  const exportMessage = cursor ? `Export "${ellipsize(headValue(cursor))}"` + (descendants.length > 0 ? ` and ${descendants.length} subthoughts${descendants.length === 1 ? '' : 's'} as ${selected.label}` : '') : null

  const textInput = useRef('')

  useEffect(() => {
    document.addEventListener('click', onClickOutside)

    if (cursor) {
      setClipboard(exportContext(pathToContext(cursor), selected.type))
      textInput.current.value = clipboard
    }

    return () => {
      document.removeEventListener('click', onClickOutside)
    }
  })

  const onClickOutside = e => {
    if (isOpen && wrapperRef && !wrapperRef.contains(e.target)) {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

  const onExportClick = () => {
    const exported = exportContext(pathToContext(cursor), selected.type)
    download(exported, `em-${timestamp()}.${selected.extension}`, selected.type)
    dispatch({ type: 'modalRemindMeLater', id: 'export' })
  }

  const onCopyClick = e => {
    e.preventDefault()
    textInput.current.select()
    document.execCommand('copy')
    alert(`Thoughts copied`)
    clearTimeout(globals.errorTimer)
    globals.errorTimer = window.setTimeout(() => alert(null), 10000)

  }

  const closeModal = () => {
    alert(null)
    setIsOpen(!isOpen)
    dispatch({ type: 'modalRemindMeLater', id: 'help' })
  }

  return (
    <Modal id='export' title='Export' className='popup'>
      <div className='modal-export-wrapper'>
        <span className='modal-content-to-export'>{exportMessage}</span>
        <span className='modal-drop-down-holder'>
          <img
            src={dark ? ArrowDownWhite : ArrowDownBlack}
            alt='Arrow'
            height='22px'
            width='22px'
            style={{ cursor: 'pointer' }}
            onClick={closeModal}
          />
          <div ref={setWrapper}>
            <DropDownMenu
              isOpen={isOpen}
              selected={selected}
              onSelect={option => {
                setSelected(option)
                setIsOpen(false)
              }}
              options={exportOptions}
              dark={dark}
            />
          </div>
        </span>
      </div>
      <div className="cp-clipboard-wrapper">
        <a href="#" onClick={onCopyClick}>Copy to clipboard</a>
        <textarea ref={textInput} />
      </div>
      <div className='modal-export-btns-wrapper'>
        <button className='modal-btn-export' style={dark
          ? {
            color: 'black',
            backgroundColor: 'white',
          } : {
            color: 'white',
            backgroundColor: 'black',
          }
        } onClick={onExportClick}
        >Export</button>
        <button
          className='modal-btn-cancel'
          style={{
            fontSize: '14px',
            color: dark ? 'white' : 'black'
          }}
          onClick={closeModal}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}

export default ModalExport
