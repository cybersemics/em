import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from './Modal.js'
import DropDownMenu from './DropDownMenu.js'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'
//  util's.js
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

  const dark = getSetting('Theme') !== 'Light'
  const descendants = cursor ? getDescendants(cursor) : []
  const exportMessage = cursor ? `Export "${ellipsize(headValue(cursor))}"` + (descendants.length > 0 ? ` and ${descendants.length} subthoughts${descendants.length === 1 ? '' : 's'} as ${selected.label}` : '') : null

  useEffect(() => {
    document.addEventListener('click', onClickOutside)

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
            onClick={e => setIsOpen(!isOpen)}
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
          onClick={e => {
            dispatch({ type: 'modalRemindMeLater', id: 'help' })
          }}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}

export default ModalExport
